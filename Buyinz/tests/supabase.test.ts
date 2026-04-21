jest.mock('expo-linking', () => ({
  createURL: jest.fn(),
}));

jest.mock('@/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

import * as Linking from 'expo-linking';
import { supabase } from '@/supabase/client';
import {
  authenticate,
  authenticateWithGoogle,
  buildUsersUpsertPayload,
  checkUsernameAvailable,
  deleteProfileForCurrentUser,
  isBuyinzProfileComplete,
  isPostgresUniqueViolation,
  isProfileOnboardingComplete,
  profileCoreComplete,
  saveProfile,
  storeAddressPartsComplete,
  validateProfileForSave,
} from '../lib/supabase';

const mockedFrom = supabase.from as jest.Mock;
const mockedSignInWithPassword = supabase.auth.signInWithPassword as jest.Mock;
const mockedSignUp = supabase.auth.signUp as jest.Mock;
const mockedSignInWithOAuth = supabase.auth.signInWithOAuth as jest.Mock;
const mockedCreateURL = Linking.createURL as jest.Mock;

/** Matches `await supabase.from(...).upsert(...).select().single()` resolving to `{ data, error }`. */
function mockUsersUpsertChain(data: unknown, error: unknown | null) {
  const payload = { data, error };
  const builder: Record<string, unknown> & { then: typeof Promise.prototype.then } = {
    then: (onF, onR) => Promise.resolve(payload).then(onF, onR),
  };
  for (const name of ['upsert', 'select', 'single']) {
    builder[name] = () => builder;
  }
  return builder;
}

function mockUsersSelectUsernameChain(data: unknown, error: unknown | null) {
  const payload = { data, error };
  const builder: Record<string, unknown> = {};
  builder.maybeSingle = async () => payload;
  builder.eq = () => builder;
  builder.select = () => builder;
  return builder;
}

function mockUsersDeleteChain(error: unknown | null) {
  return {
    delete: () => ({
      eq: () => Promise.resolve({ error, data: null }),
    }),
  };
}

describe('validateProfileForSave', () => {
  it('throws when username is missing', () => {
    expect(() =>
      validateProfileForSave({
        account_type: 'user',
        display_name: 'Test User',
        username: '',
        location: '90210',
      }),
    ).toThrow('Missing mandatory fields: Name and Username');
  });

  it('allows missing bio and location for shoppers', () => {
    expect(() =>
      validateProfileForSave({
        account_type: 'user',
        display_name: 'Test User',
        username: 'u1',
      }),
    ).not.toThrow();
  });
});

describe('profileCoreComplete and onboarding', () => {
  it('profileCoreComplete is true with only name and username (no zip)', () => {
    expect(
      profileCoreComplete({
        display_name: 'A',
        username: 'b',
      }),
    ).toBe(true);
  });

  it('profileCoreComplete is false without username', () => {
    expect(
      profileCoreComplete({
        display_name: 'A',
        username: '',
      }),
    ).toBe(false);
  });

  it('isProfileOnboardingComplete is true for shopper without bio or location', () => {
    expect(
      isProfileOnboardingComplete({
        account_type: 'user',
        display_name: 'A',
        username: 'b',
        bio: '',
      }),
    ).toBe(true);
  });

  it('isBuyinzProfileComplete matches isProfileOnboardingComplete', () => {
    expect(
      isBuyinzProfileComplete({
        account_type: 'user',
        display_name: 'Jane',
        username: 'jane',
        bio: null,
      }),
    ).toBe(true);
  });

  it('isProfileOnboardingComplete is true for store when address and coords set', () => {
    expect(
      isProfileOnboardingComplete({
        account_type: 'store',
        display_name: 'Thrift Co',
        username: 'thriftco',
        location: '15213',
        address_line1: '123 Main St',
        city: 'Pittsburgh',
        region: 'PA',
        postal_code: '15213',
        latitude: 40.44,
        longitude: -79.99,
      }),
    ).toBe(true);
  });

  it('isProfileOnboardingComplete is false for store without coordinates', () => {
    expect(
      isProfileOnboardingComplete({
        account_type: 'store',
        display_name: 'Thrift Co',
        username: 'thriftco',
        location: '15213',
        address_line1: '123 Main St',
        city: 'Pittsburgh',
        region: 'PA',
        postal_code: '15213',
        latitude: null,
        longitude: null,
      }),
    ).toBe(false);
  });
});

describe('storeAddressPartsComplete', () => {
  it('is true when all parts non-empty', () => {
    expect(
      storeAddressPartsComplete({
        address_line1: '1 A St',
        city: 'Pittsburgh',
        region: 'PA',
        postal_code: '15213',
      }),
    ).toBe(true);
  });

  it('is false when a part is empty', () => {
    expect(
      storeAddressPartsComplete({
        address_line1: '1 A St',
        city: '',
        region: 'PA',
        postal_code: '15213',
      }),
    ).toBe(false);
  });
});

describe('checkUsernameAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when no row', async () => {
    mockedFrom.mockReturnValue(mockUsersSelectUsernameChain(null, null));
    await expect(checkUsernameAvailable('newuser')).resolves.toBe(true);
    expect(mockedFrom).toHaveBeenCalledWith('users');
  });

  it('returns false when another user has username', async () => {
    mockedFrom.mockReturnValue(
      mockUsersSelectUsernameChain({ id: 'other-id' }, null),
    );
    await expect(checkUsernameAvailable('taken')).resolves.toBe(false);
  });

  it('returns true when row is excludeUserId', async () => {
    mockedFrom.mockReturnValue(
      mockUsersSelectUsernameChain({ id: 'same-id' }, null),
    );
    await expect(
      checkUsernameAvailable('self', { excludeUserId: 'same-id' }),
    ).resolves.toBe(true);
  });
});

describe('buildUsersUpsertPayload', () => {
  it('maps UserProfile fields to the users table upsert columns', () => {
    const profile = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      account_type: 'user' as const,
      display_name: 'Jane Buyer',
      username: 'jane_buyer',
      location: '10001',
      bio: 'Looking for deals',
      avatar_url: 'https://cdn.example/avatar.jpg',
      isVerified: true,
    };

    expect(buildUsersUpsertPayload(profile)).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440000',
      account_type: 'user',
      display_name: 'Jane Buyer',
      username: 'jane_buyer',
      location: '10001',
      bio: 'Looking for deals',
      avatar_url: 'https://cdn.example/avatar.jpg',
      address_line1: null,
      city: null,
      region: null,
      postal_code: null,
      address_string: null,
      latitude: null,
      longitude: null,
      formatted_address: null,
    });
  });

  it('maps shopper with empty location to null', () => {
    expect(
      buildUsersUpsertPayload({
        id: 'u1',
        account_type: 'user',
        display_name: 'A',
        username: 'a',
        location: '',
        avatar_url: undefined,
      }),
    ).toMatchObject({
      location: null,
      bio: null,
    });
  });
});

describe('isPostgresUniqueViolation', () => {
  it('is true for code 23505 and false otherwise', () => {
    expect(isPostgresUniqueViolation({ code: '23505' })).toBe(true);

    expect(isPostgresUniqueViolation({ code: '23503' })).toBe(false);
    expect(isPostgresUniqueViolation({ code: '42P01' })).toBe(false);
    expect(isPostgresUniqueViolation({ code: undefined })).toBe(false);
    expect(isPostgresUniqueViolation({})).toBe(false);
  });
});

describe('deleteProfileForCurrentUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes by user id', async () => {
    mockedFrom.mockReturnValue(mockUsersDeleteChain(null));
    await deleteProfileForCurrentUser('user-uuid-1');
    expect(mockedFrom).toHaveBeenCalledWith('users');
  });

  it('throws when delete returns error', async () => {
    mockedFrom.mockReturnValue(mockUsersDeleteChain({ message: 'rls' }));
    await expect(deleteProfileForCurrentUser('user-uuid-1')).rejects.toThrow('rls');
  });
});

describe('saveProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('upserts on id so username changes update the existing row', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const upsert = jest.fn().mockReturnValue({ select });
    mockedFrom.mockReturnValue({ upsert });

    await saveProfile({
      id: '550e8400-e29b-41d4-a716-446655440000',
      account_type: 'user',
      display_name: 'Test',
      username: 'new_handle',
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '550e8400-e29b-41d4-a716-446655440000',
        username: 'new_handle',
      }),
      { onConflict: 'id' },
    );
  });

  it('throws Username must be unique when upsert returns unique violation 23505', async () => {
    mockedFrom.mockReturnValue(mockUsersUpsertChain(null, { code: '23505' }));

    await expect(
      saveProfile({
        account_type: 'user',
        display_name: 'Test',
        username: 'taken_name',
      }),
    ).rejects.toThrow('Username must be unique');

    expect(mockedFrom).toHaveBeenCalledWith('users');
  });
});

describe('authenticate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 and user id when sign-in succeeds; does not call signUp', async () => {
    mockedSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'auth-user-id-1' } },
    });

    const result = await authenticate('person@example.com');

    expect(result).toEqual({ status: 200, user: { id: 'auth-user-id-1' } });
    expect(mockedSignInWithPassword).toHaveBeenCalledWith({
      email: 'person@example.com',
      password: 'BuyinzUser!123',
    });
    expect(mockedSignUp).not.toHaveBeenCalled();
  });

  it('falls back to signUp when sign-in returns no user and sign-up succeeds', async () => {
    mockedSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });
    mockedSignUp.mockResolvedValue({
      data: { user: { id: 'signup-user-id' } },
      error: null,
    });

    const result = await authenticate('newuser@example.com');

    expect(result).toEqual({ status: 200, user: { id: 'signup-user-id' } });
    expect(mockedSignInWithPassword).toHaveBeenCalledWith({
      email: 'newuser@example.com',
      password: 'BuyinzUser!123',
    });
    expect(mockedSignUp).toHaveBeenCalledWith({
      email: 'newuser@example.com',
      password: 'BuyinzUser!123',
    });
  });
});

describe('authenticateWithGoogle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes redirectTo from Linking.createURL into signInWithOAuth', async () => {
    const redirectUrl = 'exp://192.168.1.1:8081/--/auth/callback';
    mockedCreateURL.mockReturnValue(redirectUrl);
    mockedSignInWithOAuth.mockResolvedValue({ data: { url: 'https://accounts.google.com/o/oauth2/...' }, error: null });

    await authenticateWithGoogle();

    expect(mockedCreateURL).toHaveBeenCalledWith('auth/callback');
    expect(mockedSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });
  });
});
