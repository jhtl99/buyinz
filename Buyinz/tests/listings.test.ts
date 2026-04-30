jest.mock('@/supabase/queries', () => ({
  insertPost: jest.fn(),
}));

import * as Queries from '@/supabase/queries';
import {
  EMPTY_DRAFT,
  getListingPriceValidationError,
  MAX_PHOTOS,
  isDraftValid,
  priceStringToDbValue,
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

describe('priceStringToDbValue', () => {
  it('returns null for empty or whitespace-only string', () => {
    expect(priceStringToDbValue('')).toBeNull();
    expect(priceStringToDbValue('   ')).toBeNull();
  });

  it('returns null for non-numeric text', () => {
    expect(priceStringToDbValue('free')).toBeNull();
  });

  it('parses integers and decimals', () => {
    expect(priceStringToDbValue('10')).toBe(10);
    expect(priceStringToDbValue('12.50')).toBe(12.5);
    expect(priceStringToDbValue('0')).toBe(0);
  });

  it('returns null when parseFloat yields non-finite value', () => {
    expect(priceStringToDbValue('1e400')).toBeNull();
  });

  it('rejects leading-number suffix text', () => {
    expect(priceStringToDbValue('99usd')).toBeNull();
  });
});

describe('getListingPriceValidationError', () => {
  it('allows empty price because it is optional', () => {
    expect(getListingPriceValidationError('')).toBeNull();
    expect(getListingPriceValidationError('   ')).toBeNull();
  });

  it('accepts valid prices within range', () => {
    expect(getListingPriceValidationError('0')).toBeNull();
    expect(getListingPriceValidationError('19.99')).toBeNull();
    expect(getListingPriceValidationError('10000')).toBeNull();
  });

  it('rejects prices with too many decimal places', () => {
    expect(getListingPriceValidationError('0.000001')).toMatch(/decimal/i);
  });

  it('rejects prices above the maximum', () => {
    expect(getListingPriceValidationError('999999999')).toMatch(/10,000/i);
  });
});

describe('isDraftValid', () => {
  it('returns true when at least one photo is present', () => {
    expect(isDraftValid(minimalValidDraft())).toBe(true);
  });

  it('requires at least one image', () => {
    expect(isDraftValid(minimalValidDraft({ images: [] }))).toBe(false);
  });

  it('allows empty or whitespace-only title', () => {
    expect(isDraftValid(minimalValidDraft({ title: '' }))).toBe(true);
    expect(isDraftValid(minimalValidDraft({ title: '   ' }))).toBe(true);
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

  it('rejects prices above the configured max', () => {
    expect(isDraftValid(minimalValidDraft({ price: '999999999' }))).toBe(false);
  });

  it('rejects prices with too many decimals', () => {
    expect(isDraftValid(minimalValidDraft({ price: '0.000001' }))).toBe(false);
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
