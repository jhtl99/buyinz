import type { ListingDraft } from '../lib/listings';
import { supabase } from '../supabase/client';
import {
  buildListingImageStoragePath,
  contentTypeForImageExtension,
  extensionFromUri,
  insertPost,
  publicUrlForListingImagePath,
  uploadArrayBufferToListingImages,
  uploadListingImages,
} from '../supabase/postsInsert';

jest.mock('../supabase/client', () => ({
  supabase: {
    storage: { from: jest.fn() },
    from: jest.fn(),
  },
}));

describe('postsInsert', () => {
  describe('extensionFromUri', () => {
    it('returns the lowercase extension after the last dot', () => {
      expect(extensionFromUri('file:///tmp/photo.JPEG')).toBe('jpeg');
      expect(extensionFromUri('https://cdn.example.com/asset.PNG')).toBe('png');
      expect(extensionFromUri('listing.webp')).toBe('webp');
    });

    it('uses the last path segment as the extension when there is no dot', () => {
      expect(extensionFromUri('no-dots-here')).toBe('no-dots-here');
    });

    it('returns an empty string when the path ends with a dot (no extension segment)', () => {
      expect(extensionFromUri('file.')).toBe('');
    });
  });

  describe('buildListingImageStoragePath', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('concatenates Date.now(), a 6-char base36 segment, and the extension', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
      jest.spyOn(Math, 'random').mockReturnValue(0.99999);

      expect(buildListingImageStoragePath('jpg')).toBe('1700000000000-zzzj7c.jpg');
      expect(buildListingImageStoragePath('png')).toBe('1700000000000-zzzj7c.png');
    });
  });

  describe('contentTypeForImageExtension', () => {
    it('maps jpg to image/jpeg', () => {
      expect(contentTypeForImageExtension('jpg')).toBe('image/jpeg');
    });

    it('uses the extension as the subtype for other common formats', () => {
      expect(contentTypeForImageExtension('png')).toBe('image/png');
      expect(contentTypeForImageExtension('webp')).toBe('image/webp');
      expect(contentTypeForImageExtension('jpeg')).toBe('image/jpeg');
    });
  });

  describe('uploadArrayBufferToListingImages', () => {
    const mockUpload = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      mockUpload.mockResolvedValue({ error: null });
      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: mockUpload,
      });
    });

    it('uploads to the listing-images bucket with path, body, and contentType', async () => {
      const body = new ArrayBuffer(4);

      await uploadArrayBufferToListingImages('abc-xyz.jpg', body, 'image/jpeg');

      expect(supabase.storage.from).toHaveBeenCalledWith('listing-images');
      expect(mockUpload).toHaveBeenCalledWith('abc-xyz.jpg', body, { contentType: 'image/jpeg' });
    });

    it('throws when storage upload returns an error', async () => {
      const storageError = new Error('Upload failed');
      mockUpload.mockResolvedValue({ error: storageError });

      await expect(
        uploadArrayBufferToListingImages('x.png', new ArrayBuffer(0), 'image/png'),
      ).rejects.toThrow(storageError);
    });
  });

  describe('publicUrlForListingImagePath', () => {
    const mockGetPublicUrl = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      mockGetPublicUrl.mockReturnValue({
        data: {
          publicUrl:
            'https://project.supabase.co/storage/v1/object/public/listing-images/1700000000000-zzzj7c.jpg',
        },
      });
      (supabase.storage.from as jest.Mock).mockReturnValue({
        getPublicUrl: mockGetPublicUrl,
      });
    });

    it('returns data.publicUrl from listing-images getPublicUrl', () => {
      const url = publicUrlForListingImagePath('1700000000000-zzzj7c.jpg');

      expect(supabase.storage.from).toHaveBeenCalledWith('listing-images');
      expect(mockGetPublicUrl).toHaveBeenCalledWith('1700000000000-zzzj7c.jpg');
      expect(url).toBe(
        'https://project.supabase.co/storage/v1/object/public/listing-images/1700000000000-zzzj7c.jpg',
      );
    });
  });

  describe('uploadListingImages', () => {
    const mockUpload = jest.fn();
    const mockGetPublicUrl = jest.fn();
    let originalFetch: typeof global.fetch;

    beforeAll(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      jest.restoreAllMocks();
      global.fetch = originalFetch;
    });

    beforeEach(() => {
      jest.clearAllMocks();
      mockUpload.mockResolvedValue({ error: null });
      mockGetPublicUrl.mockImplementation((path: string) => ({
        data: { publicUrl: `https://example.test/object/${path}` },
      }));
      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });
    });

    it('returns an empty array when there are no images', async () => {
      await expect(uploadListingImages([])).resolves.toEqual([]);
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('fetches each URI, uploads to storage, and returns public URLs', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
      jest.spyOn(Math, 'random').mockReturnValue(0.99999);
      const bytes = new Uint8Array([7, 8, 9]).buffer;
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(bytes),
      });

      const urls = await uploadListingImages([
        { uri: 'https://host/photo.JPEG', width: 10, height: 20 },
      ]);

      expect(global.fetch).toHaveBeenCalledWith('https://host/photo.JPEG');
      expect(mockUpload).toHaveBeenCalledTimes(1);
      expect(mockUpload).toHaveBeenCalledWith(
        '1700000000000-zzzj7c.jpeg',
        bytes,
        { contentType: 'image/jpeg' },
      );
      expect(urls).toEqual(['https://example.test/object/1700000000000-zzzj7c.jpeg']);
    });

    it('processes multiple images in order', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.99999).mockReturnValueOnce(0.88888);

      const bufA = new ArrayBuffer(2);
      const bufB = new ArrayBuffer(3);
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          arrayBuffer: jest.fn().mockResolvedValue(bufA),
        })
        .mockResolvedValueOnce({
          arrayBuffer: jest.fn().mockResolvedValue(bufB),
        });

      const urls = await uploadListingImages([
        { uri: 'https://a/file.png', width: 1, height: 1 },
        { uri: 'https://b/x.jpg', width: 1, height: 1 },
      ]);

      expect(global.fetch).toHaveBeenNthCalledWith(1, 'https://a/file.png');
      expect(global.fetch).toHaveBeenNthCalledWith(2, 'https://b/x.jpg');
      expect(mockUpload).toHaveBeenNthCalledWith(
        1,
        '1700000000000-zzzj7c.png',
        bufA,
        { contentType: 'image/png' },
      );
      expect(mockUpload).toHaveBeenNthCalledWith(
        2,
        '1700000000000-vzzl2i.jpg',
        bufB,
        { contentType: 'image/jpeg' },
      );
      expect(urls).toEqual([
        'https://example.test/object/1700000000000-zzzj7c.png',
        'https://example.test/object/1700000000000-vzzl2i.jpg',
      ]);
    });
  });

  describe('insertPost', () => {
    const mockUpload = jest.fn();
    const mockGetPublicUrl = jest.fn();
    const mockInsert = jest.fn();
    const mockSelect = jest.fn();
    const mockSingle = jest.fn();
    let originalFetch: typeof global.fetch;

    beforeAll(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      jest.restoreAllMocks();
      global.fetch = originalFetch;
    });

    function baseDraft(overrides: Partial<ListingDraft> = {}): ListingDraft {
      return {
        images: [{ uri: 'https://cdn/item.JPG', width: 1, height: 1 }],
        title: 'Desk',
        price: '45',
        ...overrides,
      };
    }

    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
      jest.spyOn(Math, 'random').mockReturnValue(0.99999);

      const bytes = new Uint8Array([1]).buffer;
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(bytes),
      });

      mockUpload.mockResolvedValue({ error: null });
      mockGetPublicUrl.mockImplementation((path: string) => ({
        data: { publicUrl: `https://example.test/object/${path}` },
      }));
      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });

      mockSingle.mockResolvedValue({ data: { id: 'new-post-id' }, error: null });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockInsert.mockReturnValue({ select: mockSelect });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'posts') {
          return { insert: mockInsert };
        }
        return {};
      });
    });

    it('inserts a row with parsed price and uploaded images, default mock user when userId omitted', async () => {
      const draft = baseDraft();

      const id = await insertPost(draft);

      expect(id).toBe('new-post-id');
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: '11111111-1111-1111-1111-111111111111',
        type: 'sale',
        title: 'Desk',
        description: null,
        price: 45,
        images: ['https://example.test/object/1700000000000-zzzj7c.jpg'],
      });
    });

    it('inserts null price when draft price is empty', async () => {
      const draft = baseDraft({ price: '' });

      await insertPost(draft);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          price: null,
        }),
      );
    });

    it('inserts null title when draft title is empty', async () => {
      await insertPost(baseDraft({ title: '' }));

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: null,
        }),
      );
    });

    it('inserts null title when draft title is whitespace only', async () => {
      await insertPost(baseDraft({ title: '   ' }));

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: null,
        }),
      );
    });

    it('uses the provided user id', async () => {
      await insertPost(baseDraft(), 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        }),
      );
    });

    it('throws when the posts insert returns an error', async () => {
      const dbError = new Error('RLS');
      mockSingle.mockResolvedValueOnce({ data: null, error: dbError });

      await expect(insertPost(baseDraft())).rejects.toThrow(dbError);
    });
  });
});
