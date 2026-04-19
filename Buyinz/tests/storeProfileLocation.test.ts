/**
 * Store account creation & location setup — data-layer behavior aligned with the user story:
 * structured address, geocoded lat/lng, US format checks, and DB payload shape.
 *
 * Avoids real network: mocks Supabase client (no actual API calls).
 */

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'exp://test/auth/callback'),
}));

jest.mock('@/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

import { supabase } from '@/supabase/client';
import {
  validateUsStoreAddressFormat,
  normalizeUsStateRegion,
} from '../lib/addressValidation';
import {
  buildUsersUpsertPayload,
  composeStoreAddressString,
  geocodeAddressString,
  isProfileOnboardingComplete,
  validateOnboardingSave,
} from '../lib/supabase';

const getSessionMock = supabase.auth.getSession as jest.Mock;
const functionsInvokeMock = supabase.functions.invoke as jest.Mock;

describe('Store profile & location (user story)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isProfileOnboardingComplete', () => {
    it('is false for store when address parts exist but coordinates are missing', () => {
      expect(
        isProfileOnboardingComplete({
          account_type: 'store',
          display_name: 'Thrift Co',
          username: 'thriftco',
          location: '15213',
          address_line1: '5000 Forbes Ave',
          city: 'Pittsburgh',
          region: 'PA',
          postal_code: '15213',
          latitude: null,
          longitude: null,
        }),
      ).toBe(false);
    });

    it('is true for store when business name, handle, address, and geocoded coords are present', () => {
      expect(
        isProfileOnboardingComplete({
          account_type: 'store',
          display_name: 'Thrift Co',
          username: 'thriftco',
          location: '15213',
          address_line1: '5000 Forbes Ave',
          city: 'Pittsburgh',
          region: 'PA',
          postal_code: '15213',
          latitude: 40.4433,
          longitude: -79.9436,
        }),
      ).toBe(true);
    });

    it('does not require store-style address fields for shopper accounts', () => {
      expect(
        isProfileOnboardingComplete({
          account_type: 'user',
          display_name: 'Alex',
          username: 'alex',
          location: '15213',
        }),
      ).toBe(true);
    });
  });

  describe('composeStoreAddressString', () => {
    it('joins trimmed parts into a single line for geocoding', () => {
      expect(
        composeStoreAddressString({
          address_line1: '  123 Main St  ',
          city: 'Pittsburgh',
          region: 'PA',
          postal_code: '15213',
        }),
      ).toBe('123 Main St, Pittsburgh, PA, 15213');
    });
  });

  describe('validateUsStoreAddressFormat', () => {
    it('rejects invalid ZIP (user story: collect valid address parts before geocode)', () => {
      const r = validateUsStoreAddressFormat({
        address_line1: '1 Main',
        city: 'Pittsburgh',
        region: 'PA',
        postal_code: '123',
      });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.message).toMatch(/ZIP/i);
      }
    });

    it('accepts valid US ZIP and 2-letter state', () => {
      expect(
        validateUsStoreAddressFormat({
          address_line1: '5000 Forbes Ave',
          city: 'Pittsburgh',
          region: 'pa',
          postal_code: '15213-1234',
        }).ok,
      ).toBe(true);
    });
  });

  describe('normalizeUsStateRegion', () => {
    it('normalizes state to 2 uppercase letters for geocode options', () => {
      expect(normalizeUsStateRegion(' pa ')).toBe('PA');
    });
  });

  describe('validateOnboardingSave', () => {
    it('throws for store profile missing coordinates (location not verified)', () => {
      expect(() =>
        validateOnboardingSave({
          account_type: 'store',
          display_name: 'Shop',
          username: 'shop1',
          location: '15213',
          address_line1: '1 St',
          city: 'City',
          region: 'PA',
          postal_code: '15213',
          latitude: null,
          longitude: null,
        }),
      ).toThrow(
        'Missing mandatory fields: business name, handle, full address, or location could not be verified.',
      );
    });

    it('allows store save when coordinates and address are complete', () => {
      expect(() =>
        validateOnboardingSave({
          account_type: 'store',
          display_name: 'Shop',
          username: 'shop1',
          location: '15213',
          address_line1: '1 Main St',
          city: 'Pittsburgh',
          region: 'PA',
          postal_code: '15213',
          address_string: '1 Main St, Pittsburgh, PA, 15213',
          latitude: 40.44,
          longitude: -79.99,
          formatted_address: '1 Main St, Pittsburgh, PA 15213, USA',
        }),
      ).not.toThrow();
    });
  });

  describe('buildUsersUpsertPayload', () => {
    it('includes account_type, address fields, and coordinates for store rows', () => {
      const payload = buildUsersUpsertPayload({
        id: 'user-uuid',
        account_type: 'store',
        display_name: 'My Store',
        username: 'mystore',
        location: '15213',
        bio: undefined,
        address_line1: '1 St',
        city: 'Pittsburgh',
        region: 'PA',
        postal_code: '15213',
        address_string: '1 St, Pittsburgh, PA, 15213',
        latitude: 40.4,
        longitude: -79.9,
        formatted_address: 'formatted',
      });

      expect(payload).toEqual(
        expect.objectContaining({
          account_type: 'store',
          address_line1: '1 St',
          city: 'Pittsburgh',
          region: 'PA',
          postal_code: '15213',
          latitude: 40.4,
          longitude: -79.9,
          formatted_address: 'formatted',
        }),
      );
      expect(payload.location).toBe('15213');
    });
  });

  describe('geocodeAddressString', () => {
    it('throws when address is empty or whitespace', async () => {
      getSessionMock.mockResolvedValue({
        data: { session: { access_token: 'tok' } },
      });
      await expect(geocodeAddressString('   ')).rejects.toThrow(
        'Address is required for geocoding.',
      );
    });

    it('throws when there is no authenticated session', async () => {
      getSessionMock.mockResolvedValue({ data: { session: null } });
      await expect(
        geocodeAddressString('5000 Forbes Ave, Pittsburgh, PA, 15213'),
      ).rejects.toThrow('Sign in again to verify your address.');
    });

    it('calls geocode-address with address and expected ZIP/state when options provided', async () => {
      getSessionMock.mockResolvedValue({
        data: { session: { access_token: 'jwt-token' } },
      });
      functionsInvokeMock.mockResolvedValue({
        data: {
          latitude: 40.44,
          longitude: -79.99,
          formatted_address: '5000 Forbes Ave, Pittsburgh, PA 15213, USA',
        },
        error: null,
        response: undefined,
      });

      const result = await geocodeAddressString(
        '5000 Forbes Ave, Pittsburgh, PA, 15213',
        { expectedPostalCode: '15213', expectedRegion: 'PA' },
      );

      expect(result.latitude).toBe(40.44);
      expect(result.longitude).toBe(-79.99);
      expect(result.formatted_address).toContain('Pittsburgh');

      expect(functionsInvokeMock).toHaveBeenCalledWith(
        'geocode-address',
        expect.objectContaining({
          body: expect.objectContaining({
            address: '5000 Forbes Ave, Pittsburgh, PA, 15213',
            expected_postal_code: '15213',
            expected_region: 'PA',
          }),
          headers: { Authorization: 'Bearer jwt-token' },
        }),
      );
    });

    it('returns warnings from Edge Function when present', async () => {
      getSessionMock.mockResolvedValue({
        data: { session: { access_token: 'tok' } },
      });
      functionsInvokeMock.mockResolvedValue({
        data: {
          latitude: 40.0,
          longitude: -80.0,
          warnings: ['Approximate location.'],
        },
        error: null,
      });

      const result = await geocodeAddressString('Some St, City, PA, 15213');
      expect(result.warnings).toEqual(['Approximate location.']);
    });

    it('throws with message when invoke returns error', async () => {
      getSessionMock.mockResolvedValue({
        data: { session: { access_token: 'tok' } },
      });
      const zipMismatch = 'ZIP code does not match the location found (15120).';
      const fnResponse = {
        json: jest.fn(),
        clone() {
          return {
            json: async () => ({ error: zipMismatch }),
          };
        },
      };
      functionsInvokeMock.mockResolvedValue({
        data: null,
        error: new Error('Edge Function returned a non-2xx status code'),
        response: fnResponse,
      });

      await expect(
        geocodeAddressString('x', { expectedPostalCode: '15213', expectedRegion: 'PA' }),
      ).rejects.toThrow(zipMismatch);
    });
  });
});
