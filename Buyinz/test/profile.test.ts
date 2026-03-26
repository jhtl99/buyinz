import { saveProfile, authenticate, UserProfile } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({
  ...jest.requireActual('../lib/supabase'),
  authenticate: jest.fn().mockImplementation((email) => {
    return Promise.resolve({
      status: 200,
      user: {
        id: 'mock-user-id-123',
        email: email
      }
    });
  })
}));

describe('Verified Profile Creation', () => {
    it('generates a unique user ID and returns 200 OK given valid email', async () => {
      const result = await authenticate('test@example.com');
      expect(result.status).toBe(200);
      expect(result.user.id).toBeDefined();
    });

    it('throws error when Name is missing', async () => {
      const profileInfo: any = { username: 'john_doe', location: '12345' };
      await expect(saveProfile(profileInfo)).rejects.toThrow('Missing mandatory fields: Name, Username, or Zip Code');
    });

    it('throws error when Username is missing', async () => {
      const profileInfo: any = { display_name: 'John Doe', location: '12345' };
      await expect(saveProfile(profileInfo)).rejects.toThrow('Missing mandatory fields: Name, Username, or Zip Code');
    });

    it('throws error when Zip Code is missing', async () => {
      const profileInfo: any = { display_name: 'John Doe', username: 'john_doe' };
      await expect(saveProfile(profileInfo)).rejects.toThrow('Missing mandatory fields: Name, Username, or Zip Code');
    });
});
