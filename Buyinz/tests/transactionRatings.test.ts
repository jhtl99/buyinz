jest.mock('../supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

import { supabase } from '../supabase/client';
import {
  fetchConversationCompletion,
  fetchMyRatingForConversation,
  fetchUserRatingStats,
  markMyTransactionComplete,
  submitConversationRating,
} from '../supabase/transactionRatings';

const mockedFrom = supabase.from as jest.Mock;

type Payload = { data: unknown; error: unknown | null };

function mockChainPayload(payload: Payload): Record<string, unknown> & {
  then: typeof Promise.prototype.then;
} {
  const builder: Record<string, unknown> & { then: typeof Promise.prototype.then } = {
    then: (onF, onR) => Promise.resolve(payload).then(onF, onR),
  };
  for (const name of ['select', 'eq']) {
    builder[name] = () => builder;
  }
  builder.update = (patch: Record<string, unknown>) => {
    (builder as { _update?: Record<string, unknown> })._update = patch;
    return builder;
  };
  builder.insert = (row: Record<string, unknown>) => {
    (builder as { _insert?: Record<string, unknown> })._insert = row;
    return builder;
  };
  builder.single = () => Promise.resolve(payload);
  builder.maybeSingle = () => Promise.resolve(payload);
  return builder;
}

describe('fetchConversationCompletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns completion timestamps from conversations row', async () => {
    const isoBuyer = '2026-01-15T12:00:00.000Z';
    const isoSeller = '2026-01-16T08:30:00.000Z';
    mockedFrom.mockReturnValue(
      mockChainPayload({
        data: {
          buyer_marked_complete_at: isoBuyer,
          seller_marked_complete_at: isoSeller,
        },
        error: null,
      }),
    );

    await expect(fetchConversationCompletion('conv-1')).resolves.toEqual({
      buyer_marked_complete_at: isoBuyer,
      seller_marked_complete_at: isoSeller,
    });
    expect(mockedFrom).toHaveBeenCalledWith('conversations');
  });

  it('normalizes undefined DB fields to null', async () => {
    mockedFrom.mockReturnValue(
      mockChainPayload({
        data: { buyer_marked_complete_at: undefined, seller_marked_complete_at: null },
        error: null,
      }),
    );

    await expect(fetchConversationCompletion('conv-2')).resolves.toEqual({
      buyer_marked_complete_at: null,
      seller_marked_complete_at: null,
    });
  });

  it('throws when Supabase returns an error', async () => {
    const err = new Error('row not found');
    mockedFrom.mockReturnValue(mockChainPayload({ data: null, error: err }));

    await expect(fetchConversationCompletion('missing')).rejects.toThrow('row not found');
  });
});

describe('markMyTransactionComplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-31T14:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('updates buyer_marked_complete_at when role is buyer', async () => {
    const payload: Payload = { data: null, error: null };
    const chain = mockChainPayload(payload);
    mockedFrom.mockReturnValue(chain);

    await markMyTransactionComplete('conv-buyer', 'buyer');

    expect(mockedFrom).toHaveBeenCalledWith('conversations');
    expect((chain as { _update?: Record<string, string> })._update).toEqual({
      buyer_marked_complete_at: '2026-03-31T14:00:00.000Z',
      updated_at: '2026-03-31T14:00:00.000Z',
    });
  });

  it('updates seller_marked_complete_at when role is seller', async () => {
    const chain = mockChainPayload({ data: null, error: null });
    mockedFrom.mockReturnValue(chain);

    await markMyTransactionComplete('conv-seller', 'seller');

    expect((chain as { _update?: Record<string, string> })._update).toEqual({
      seller_marked_complete_at: '2026-03-31T14:00:00.000Z',
      updated_at: '2026-03-31T14:00:00.000Z',
    });
  });

  it('throws when update fails', async () => {
    const err = new Error('permission denied');
    mockedFrom.mockReturnValue(mockChainPayload({ data: null, error: err }));

    await expect(markMyTransactionComplete('conv-x', 'buyer')).rejects.toThrow('permission denied');
  });
});

describe('fetchMyRatingForConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns stars when a row exists', async () => {
    mockedFrom.mockReturnValue(
      mockChainPayload({
        data: { stars: 4 },
        error: null,
      }),
    );

    await expect(fetchMyRatingForConversation('c1', 'user-a')).resolves.toBe(4);
    expect(mockedFrom).toHaveBeenCalledWith('user_ratings');
  });

  it('returns null when no row exists', async () => {
    mockedFrom.mockReturnValue(mockChainPayload({ data: null, error: null }));

    await expect(fetchMyRatingForConversation('c1', 'user-a')).resolves.toBeNull();
  });

  it('returns null when data has no stars', async () => {
    mockedFrom.mockReturnValue(mockChainPayload({ data: { stars: undefined }, error: null }));

    await expect(fetchMyRatingForConversation('c1', 'user-a')).resolves.toBeNull();
  });

  it('throws on Supabase error', async () => {
    mockedFrom.mockReturnValue(
      mockChainPayload({ data: null, error: new Error('query failed') }),
    );

    await expect(fetchMyRatingForConversation('c1', 'user-a')).rejects.toThrow('query failed');
  });
});

describe('submitConversationRating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inserts clamped integer stars between 1 and 5', async () => {
    const chain = mockChainPayload({ data: null, error: null });
    mockedFrom.mockReturnValue(chain);

    await submitConversationRating('c1', 'rater', 'ratee', 3);

    expect(mockedFrom).toHaveBeenCalledWith('user_ratings');
    expect((chain as { _insert?: Record<string, unknown> })._insert).toEqual({
      conversation_id: 'c1',
      rater_id: 'rater',
      ratee_id: 'ratee',
      stars: 3,
    });
  });

  it('rounds and clamps high values to 5', async () => {
    const chain = mockChainPayload({ data: null, error: null });
    mockedFrom.mockReturnValue(chain);

    await submitConversationRating('c1', 'a', 'b', 4.8);

    expect((chain as { _insert?: Record<string, unknown> })._insert?.stars).toBe(5);
  });

  it('rounds and clamps low values to 1', async () => {
    const chain = mockChainPayload({ data: null, error: null });
    mockedFrom.mockReturnValue(chain);

    await submitConversationRating('c1', 'a', 'b', 0.2);

    expect((chain as { _insert?: Record<string, unknown> })._insert?.stars).toBe(1);
  });

  it('throws when insert returns an error', async () => {
    mockedFrom.mockReturnValue(
      mockChainPayload({ data: null, error: new Error('duplicate') }),
    );

    await expect(submitConversationRating('c1', 'a', 'b', 5)).rejects.toThrow('duplicate');
  });
});

describe('fetchUserRatingStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
  });

  it('returns parsed averageRating and ratingCount for a row', async () => {
    mockedFrom.mockReturnValue(
      mockChainPayload({
        data: { average_rating: 4.25, rating_count: 12 },
        error: null,
      }),
    );

    await expect(fetchUserRatingStats('user-1')).resolves.toEqual({
      averageRating: 4.25,
      ratingCount: 12,
    });
    expect(mockedFrom).toHaveBeenCalledWith('users');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('returns null when no user row', async () => {
    mockedFrom.mockReturnValue(mockChainPayload({ data: null, error: null }));

    await expect(fetchUserRatingStats('missing')).resolves.toBeNull();
  });

  it('returns null without warning for missing-column style errors', async () => {
    mockedFrom.mockReturnValue(
      mockChainPayload({
        data: null,
        error: { code: '42703', message: 'column average_rating does not exist' },
      }),
    );

    await expect(fetchUserRatingStats('user-1')).resolves.toBeNull();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('warns and returns null for other Supabase errors', async () => {
    mockedFrom.mockReturnValue(
      mockChainPayload({
        data: null,
        error: { message: 'network timeout' },
      }),
    );

    await expect(fetchUserRatingStats('user-1')).resolves.toBeNull();
    expect(console.warn).toHaveBeenCalledWith('[fetchUserRatingStats]', 'network timeout');
  });

  it('coerces rating_count string and null average to 0', async () => {
    mockedFrom.mockReturnValue(
      mockChainPayload({
        data: { average_rating: null, rating_count: '7' },
        error: null,
      }),
    );

    await expect(fetchUserRatingStats('user-1')).resolves.toEqual({
      averageRating: 0,
      ratingCount: 7,
    });
  });
});
