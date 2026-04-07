jest.mock('@/supabase/queries', () => ({
  insertPost: jest.fn(),
}));

import * as Queries from '@/supabase/queries';
import {
  CATEGORIES,
  CONDITIONS,
  EMPTY_DRAFT,
  MAX_PHOTOS,
  isDraftValid,
  isValidZip5,
  parseHashtags,
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
    condition: 'Good',
    category: 'Decor',
    zipCode: '15213',
    description: 'Works great',
    hashtags: '',
    ...overrides,
  };
}

describe('constants', () => {
  it('EMPTY_DRAFT matches expected empty shape', () => {
    expect(EMPTY_DRAFT).toEqual({
      images: [],
      title: '',
      price: '',
      condition: null,
      category: null,
      zipCode: '',
      description: '',
      hashtags: '',
    });
  });

  it('CONDITIONS lists all sale conditions', () => {
    expect(CONDITIONS).toEqual(['New', 'Like New', 'Good', 'Fair']);
  });

  it('CATEGORIES lists all sale categories', () => {
    expect(CATEGORIES).toEqual([
      'Furniture',
      'Clothing',
      'Electronics',
      'Books',
      'Decor',
      'Other',
    ]);
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

describe('isValidZip5', () => {
  it('accepts exactly five digits', () => {
    expect(isValidZip5('90210')).toBe(true);
    expect(isValidZip5('00000')).toBe(true);
  });

  it('rejects wrong length or non-digits', () => {
    expect(isValidZip5('9021')).toBe(false);
    expect(isValidZip5('902101')).toBe(false);
    expect(isValidZip5('9021a')).toBe(false);
    expect(isValidZip5('')).toBe(false);
  });
});

describe('isDraftValid', () => {
  it('returns true when all required fields are present', () => {
    expect(isDraftValid(minimalValidDraft())).toBe(true);
  });

  it('requires at least one image', () => {
    expect(isDraftValid(minimalValidDraft({ images: [] }))).toBe(false);
  });

  it('requires non-empty trimmed title', () => {
    expect(isDraftValid(minimalValidDraft({ title: '' }))).toBe(false);
    expect(isDraftValid(minimalValidDraft({ title: '   ' }))).toBe(false);
  });

  it('requires non-empty price string', () => {
    expect(isDraftValid(minimalValidDraft({ price: '' }))).toBe(false);
    expect(isDraftValid(minimalValidDraft({ price: '   ' }))).toBe(false);
  });

  it('rejects negative numeric price', () => {
    expect(isDraftValid(minimalValidDraft({ price: '-5' }))).toBe(false);
  });

  it('requires condition and category', () => {
    expect(isDraftValid(minimalValidDraft({ condition: null }))).toBe(false);
    expect(isDraftValid(minimalValidDraft({ category: null }))).toBe(false);
  });

  it('requires valid 5-digit zip', () => {
    expect(isDraftValid(minimalValidDraft({ zipCode: '1521' }))).toBe(false);
  });

  it('allows zero price when string is valid and non-negative', () => {
    expect(isDraftValid(minimalValidDraft({ price: '0' }))).toBe(true);
  });
});

describe('parseHashtags', () => {
  it('returns empty array for empty or whitespace input', () => {
    expect(parseHashtags('')).toEqual([]);
    expect(parseHashtags('  \n  ')).toEqual([]);
  });

  it('splits on commas and whitespace', () => {
    expect(parseHashtags('one two')).toEqual(['#one', '#two']);
    expect(parseHashtags('a, b,c')).toEqual(['#a', '#b', '#c']);
  });

  it('adds hash when missing and preserves existing hash', () => {
    expect(parseHashtags('sale')).toEqual(['#sale']);
    expect(parseHashtags('#already')).toEqual(['#already']);
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
