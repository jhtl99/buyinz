jest.mock('../supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

import { supabase } from '../supabase/client';
import {
  fetchConversationCompletion,
  markMyTransactionComplete,
} from '../supabase/conversationCompletion';

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
