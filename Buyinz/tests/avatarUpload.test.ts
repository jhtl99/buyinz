jest.mock('../supabase/client', () => ({
  supabase: {
    storage: { from: jest.fn() },
  },
}));

import { supabase } from '../supabase/client';
import {
  resolveAvatarUrlForProfileSave,
  uploadLocalImageToAvatarBucket,
} from '../supabase/avatarUpload';

describe('resolveAvatarUrlForProfileSave', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('returns trimmed https URLs without uploading', async () => {
    const url = 'https://lh3.googleusercontent.com/a/abc';
    await expect(resolveAvatarUrlForProfileSave(`  ${url}  `, 'user-id')).resolves.toBe(url);
    expect(supabase.storage.from).not.toHaveBeenCalled();
  });

  it('returns trimmed http URLs without uploading', async () => {
    const url = 'http://cdn.example.com/face.png';
    await expect(resolveAvatarUrlForProfileSave(url, 'user-id')).resolves.toBe(url);
    expect(supabase.storage.from).not.toHaveBeenCalled();
  });

  it('uploads local URIs and returns the storage public URL', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    global.fetch = jest.fn().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2]).buffer),
    });

    const mockUpload = jest.fn().mockResolvedValue({ error: null });
    const publicUrl =
      'https://project.supabase.co/storage/v1/object/public/avatars/u1/avatar-1700000000000.jpg';
    const mockGetPublicUrl = jest.fn().mockReturnValue({
      data: { publicUrl },
    });

    (supabase.storage.from as jest.Mock).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });

    const out = await resolveAvatarUrlForProfileSave('file:///tmp/photo.jpg', 'u1');

    expect(supabase.storage.from).toHaveBeenCalledWith('avatars');
    expect(mockUpload).toHaveBeenCalledWith(
      'u1/avatar-1700000000000.jpg',
      expect.any(ArrayBuffer),
      { contentType: 'image/jpeg', upsert: false },
    );
    expect(mockGetPublicUrl).toHaveBeenCalledWith('u1/avatar-1700000000000.jpg');
    expect(out).toBe(publicUrl);
  });
});

describe('uploadLocalImageToAvatarBucket', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('throws when storage upload returns an error', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    global.fetch = jest.fn().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    });
    const err = new Error('quota');
    (supabase.storage.from as jest.Mock).mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: err }),
      getPublicUrl: jest.fn(),
    });

    await expect(uploadLocalImageToAvatarBucket('file:///a.jpg', 'u1')).rejects.toThrow(err);
  });
});
