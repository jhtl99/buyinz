import { storeProfileAddressLine, type PublicUserProfile } from '@/supabase/usersRead';

function profile(p: Partial<PublicUserProfile>): PublicUserProfile {
  return {
    id: '1',
    username: 'u',
    display_name: 'D',
    avatar_url: null,
    location: 'legacy',
    bio: null,
    account_type: 'store',
    ...p,
  };
}

describe('storeProfileAddressLine', () => {
  it('prefers formatted_address', () => {
    expect(
      storeProfileAddressLine(
        profile({
          formatted_address: '  123 Main, City  ',
          address_line1: 'x',
          city: 'y',
          region: 'z',
          postal_code: 'w',
        }),
      ),
    ).toBe('123 Main, City');
  });

  it('composes from parts when formatted is empty', () => {
    expect(
      storeProfileAddressLine(
        profile({
          formatted_address: null,
          address_line1: '1 St',
          city: 'Pittsburgh',
          region: 'PA',
          postal_code: '15213',
        }),
      ),
    ).toBe('1 St, Pittsburgh, PA, 15213');
  });

  it('falls back to location when parts incomplete', () => {
    expect(
      storeProfileAddressLine(
        profile({
          formatted_address: null,
          address_line1: 'only',
          city: null,
          region: null,
          postal_code: null,
          location: 'ZIP 15213',
        }),
      ),
    ).toBe('ZIP 15213');
  });
});
