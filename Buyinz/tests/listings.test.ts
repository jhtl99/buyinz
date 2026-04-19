jest.mock('@/supabase/queries', () => ({
  insertPost: jest.fn(),
}));

import * as Queries from '@/supabase/queries';
import {
  EMPTY_DRAFT,
  MAX_PHOTOS,
  isDraftValid,
  parsePriceToNumber,
  submitListing,
  type ListingDraft,
} from '../lib/listings';

const insertPost = Queries.insertPost as jest.MockedFunction<typeof Queries.insertPost>;

function minimalValidDraft(overrides: Partial<ListingDraft> = {}): ListingDraft {
  return {
    images: [{ uri: 'file:///photo.jpg', width: 800, height: 600 }],
    title: 'Desk lamp',
    price: '19.99',
    ...overrides,
  };
}

describe('constants', () => {
  it('EMPTY_DRAFT matches expected empty shape', () => {
    expect(EMPTY_DRAFT).toEqual({
      images: [],
      title: '',
      price: '',
    });
  });

  it('MAX_PHOTOS is 5', () => {
    expect(MAX_PHOTOS).toBe(5);
  });
});

describe('parsePriceToNumber', () => {
  it('returns 0 for empty string', () => {
    expect(parsePriceToNumber('')).toBe(0);
  });

  it('returns 0 for non-numeric text', () => {
    expect(parsePriceToNumber('free')).toBe(0);
  });

  it('parses integers and decimals', () => {
    expect(parsePriceToNumber('10')).toBe(10);
    expect(parsePriceToNumber('12.50')).toBe(12.5);
    expect(parsePriceToNumber('0')).toBe(0);
  });

  it('returns 0 when parseFloat yields non-finite value', () => {
    expect(parsePriceToNumber('1e400')).toBe(0);
  });

  it('parses leading-number prefix like insert behavior', () => {
    expect(parsePriceToNumber('99usd')).toBe(99);
  });
});

describe('isDraftValid', () => {
  it('returns true when photos and title are present', () => {
    expect(isDraftValid(minimalValidDraft())).toBe(true);
  });

  it('requires at least one image', () => {
    expect(isDraftValid(minimalValidDraft({ images: [] }))).toBe(false);
  });

  it('requires non-empty trimmed title', () => {
    expect(isDraftValid(minimalValidDraft({ title: '' }))).toBe(false);
    expect(isDraftValid(minimalValidDraft({ title: '   ' }))).toBe(false);
  });

  it('treats price as optional', () => {
    expect(isDraftValid(minimalValidDraft({ price: '' }))).toBe(true);
    expect(isDraftValid(minimalValidDraft({ price: '   ' }))).toBe(true);
  });

  it('rejects negative numeric price when supplied', () => {
    expect(isDraftValid(minimalValidDraft({ price: '-5' }))).toBe(false);
  });

  it('allows zero price', () => {
    expect(isDraftValid(minimalValidDraft({ price: '0' }))).toBe(true);
  });
});

describe('submitListing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads insertPost via queries module and returns success with id', async () => {
    insertPost.mockResolvedValue('post-uuid-123');
    const draft = minimalValidDraft();

    const result = await submitListing(draft);

    expect(result).toEqual({ success: true, id: 'post-uuid-123' });
    expect(insertPost).toHaveBeenCalledTimes(1);
    expect(insertPost).toHaveBeenCalledWith(draft, undefined);
  });

  it('passes userId to insertPost when provided', async () => {
    insertPost.mockResolvedValue('another-id');
    const draft = minimalValidDraft();

    await submitListing(draft, 'user-abc');

    expect(insertPost).toHaveBeenCalledWith(draft, 'user-abc');
  });

  it('propagates errors from insertPost', async () => {
    insertPost.mockRejectedValue(new Error('database down'));
    await expect(submitListing(minimalValidDraft())).rejects.toThrow('database down');
  });
});
