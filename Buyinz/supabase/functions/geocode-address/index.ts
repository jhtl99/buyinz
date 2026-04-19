/**
 * Geocodes a postal address via Google Geocoding API.
 * Set secret GOOGLE_MAPS_GEOCODING_API_KEY in the Supabase project (Edge Function secrets).
 *
 * Deploy with gateway JWT verification OFF (`verify_jwt = false` in config.toml or
 * `supabase functions deploy geocode-address --no-verify-jwt`). User sessions use ES256;
 * the Edge API gateway may reject them with UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM before
 * this code runs. Authorization is enforced below via supabase.auth.getUser().
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function zipToFiveDigits(s: string): string {
  const d = s.replace(/\D/g, "");
  return d.length >= 5 ? d.slice(0, 5) : d;
}

function normalizeStateTwoLetter(s: string): string {
  return s.trim().toUpperCase().slice(0, 2);
}

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

function extractPostalAndState(
  components: AddressComponent[] | undefined,
): { postalDigits: string; state: string } {
  let postalLong = "";
  let state = "";
  for (const c of components ?? []) {
    if (c.types.includes("postal_code")) {
      postalLong = c.long_name || c.short_name || "";
    }
    if (c.types.includes("administrative_area_level_1")) {
      state = c.short_name || "";
    }
  }
  return { postalDigits: zipToFiveDigits(postalLong), state: state.trim() };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: {
      address?: string;
      expected_postal_code?: string;
      expected_region?: string;
    };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const address = typeof body.address === "string" ? body.address.trim() : "";
    if (!address) {
      return new Response(JSON.stringify({ error: "Address is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expectZip =
      typeof body.expected_postal_code === "string"
        ? body.expected_postal_code.trim()
        : "";
    const expectRegion =
      typeof body.expected_region === "string"
        ? body.expected_region.trim()
        : "";
    const doComponentCheck = !!(expectZip && expectRegion);

    const apiKey = Deno.env.get("GOOGLE_MAPS_GEOCODING_API_KEY");
    if (!apiKey) {
      console.error("GOOGLE_MAPS_GEOCODING_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: "Geocoding is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", address);
    url.searchParams.set("key", apiKey);

    const gRes = await fetch(url.toString());
    const gJson = (await gRes.json()) as {
      status: string;
      results?: Array<{
        formatted_address?: string;
        partial_match?: boolean;
        address_components?: AddressComponent[];
        geometry?: {
          location?: { lat: number; lng: number };
          location_type?: string;
        };
      }>;
      error_message?: string;
    };

    if (gJson.status === "ZERO_RESULTS" || !gJson.results?.length) {
      return new Response(
        JSON.stringify({
          error:
            "Address not found. Check street, city, state, and ZIP.",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (gJson.status !== "OK") {
      const msg =
        gJson.error_message || `Geocoding request failed (${gJson.status})`;
      console.error("Geocoding API error", gJson.status, gJson.error_message);
      return new Response(JSON.stringify({ error: msg }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const first = gJson.results[0];
    const loc = first.geometry?.location;
    if (typeof loc?.lat !== "number" || typeof loc?.lng !== "number") {
      return new Response(
        JSON.stringify({ error: "Invalid geocoding response" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const locationType = first.geometry?.location_type ?? "";
    if (locationType === "GEOMETRIC_CENTER") {
      return new Response(
        JSON.stringify({
          error:
            "That search only matched a general area. Enter a full street address with number.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (doComponentCheck) {
      const { postalDigits: gotZip, state: gotState } = extractPostalAndState(
        first.address_components,
      );
      const wantZip = zipToFiveDigits(expectZip);
      const wantState = normalizeStateTwoLetter(expectRegion);

      if (wantZip && !gotZip) {
        return new Response(
          JSON.stringify({
            error:
              "Could not verify ZIP for this address. Check the street and city.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (wantState && !gotState) {
        return new Response(
          JSON.stringify({
            error:
              "Could not verify state for this address. Check spelling.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (gotZip && wantZip && gotZip !== wantZip) {
        return new Response(
          JSON.stringify({
            error:
              `ZIP code does not match the location found (${gotZip}). Check city and ZIP.`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (gotState && wantState && gotState.toUpperCase() !== wantState) {
        return new Response(
          JSON.stringify({
            error:
              `State does not match the location found (${gotState}). Check your address.`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const warnings: string[] = [];
    if (first.partial_match) {
      warnings.push(
        "We could not fully match every part of your address—double-check the street number and spelling.",
      );
    }
    if (locationType === "APPROXIMATE") {
      warnings.push(
        "The map location is approximate—confirm this is the correct storefront.",
      );
    }

    return new Response(
      JSON.stringify({
        latitude: loc.lat,
        longitude: loc.lng,
        formatted_address: first.formatted_address,
        ...(warnings.length ? { warnings } : {}),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
