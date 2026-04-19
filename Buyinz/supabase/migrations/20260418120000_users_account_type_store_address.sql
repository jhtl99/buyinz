-- Store vs user account classification and store physical address + geocoded coordinates.

alter table public.users
  add column if not exists account_type text not null default 'user';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_account_type_check'
  ) then
    alter table public.users
      add constraint users_account_type_check
      check (account_type in ('user', 'store'));
  end if;
end $$;

comment on column public.users.account_type is 'Discriminator: shopper (user) vs thrift store account.';

alter table public.users
  add column if not exists address_line1 text,
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists postal_code text,
  add column if not exists address_string text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists formatted_address text;

comment on column public.users.address_line1 is 'Store: street line.';
comment on column public.users.city is 'Store: city.';
comment on column public.users.region is 'Store: state/region.';
comment on column public.users.postal_code is 'Store: ZIP/postal code.';
comment on column public.users.address_string is 'Full address string used for geocoding and display.';
comment on column public.users.latitude is 'Geocoded latitude (store accounts; distance discovery).';
comment on column public.users.longitude is 'Geocoded longitude (store accounts; distance discovery).';
comment on column public.users.formatted_address is 'Formatted address from geocoder (e.g. Google).';

create index if not exists users_latitude_longitude_idx
  on public.users (latitude, longitude)
  where latitude is not null and longitude is not null;
