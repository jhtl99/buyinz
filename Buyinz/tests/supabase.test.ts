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
  },
}));

import * as Linking from 'expo-linking';
import { supabase } from '@/supabase/client';
import {
  authenticate,
  authenticateWithGoogle,
  buildUsersUpsertPayload,
  isPostgresUniqueViolation,
  saveProfile,
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

describe('validateProfileForSave', () => {
  it('throws when username is missing', () => {
    expect(() =>
      validateProfileForSave({
        display_name: 'Test User',
        username: '',
        location: '90210',
      }),
    ).toThrow('Missing mandatory fields: Name, Username, or Zip Code');
  });
});

describe('buildUsersUpsertPayload', () => {
  it('maps UserProfile fields to the users table upsert columns', () => {
    const profile = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      display_name: 'Jane Buyer',
      username: 'jane_buyer',
      location: '10001',
      bio: 'Looking for deals',
      avatar_url: 'https://cdn.example/avatar.jpg',
      isVerified: true,
    };

    expect(buildUsersUpsertPayload(profile)).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440000',
      display_name: 'Jane Buyer',
      username: 'jane_buyer',
      location: '10001',
      bio: 'Looking for deals',
      avatar_url: 'https://cdn.example/avatar.jpg',
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

describe('saveProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws Username must be unique when upsert returns unique violation 23505', async () => {
    mockedFrom.mockReturnValue(mockUsersUpsertChain(null, { code: '23505' }));

    await expect(
      saveProfile({
        display_name: 'Test',
        username: 'taken_name',
        location: '90210',
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
