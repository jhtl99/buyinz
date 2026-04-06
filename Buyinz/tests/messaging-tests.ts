import { supabase } from '../supabase/client';
import {
  fetchConversations,
  fetchMessages,
  getOrCreateConversation,
  sendMessage,
  subscribeToMessages,
} from '../supabase/messaging';

jest.mock('../supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

describe('messaging', () => {
  const mockMaybeSingle = jest.fn();
  const mockSingle = jest.fn();

  function setupConversationsTableMock() {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({ maybeSingle: mockMaybeSingle })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({ single: mockSingle })),
      })),
    });
  }

  describe('getOrCreateConversation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      mockSingle.mockResolvedValue({ data: { id: 'new-conv-id' }, error: null });
      setupConversationsTableMock();
    });

    it('returns existing conversation id when a row matches listing and buyer', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'existing-conv-id' },
        error: null,
      });

      const id = await getOrCreateConversation('listing-a', 'buyer-b', 'seller-c');

      expect(id).toBe('existing-conv-id');
      expect(supabase.from).toHaveBeenCalledWith('conversations');
      const table = (supabase.from as jest.Mock).mock.results[0].value;
      expect(table.insert).not.toHaveBeenCalled();
    });

    it('inserts a new conversation and returns its id when none exists', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
      mockSingle.mockResolvedValueOnce({
        data: { id: 'inserted-id' },
        error: null,
      });

      const id = await getOrCreateConversation('listing-a', 'buyer-b', 'seller-c');

      expect(id).toBe('inserted-id');
      const table = (supabase.from as jest.Mock).mock.results[0].value;
      expect(table.insert).toHaveBeenCalledWith({
        listing_id: 'listing-a',
        buyer_id: 'buyer-b',
        seller_id: 'seller-c',
      });
    });

    it('throws when insert returns an error', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const dbError = Object.assign(new Error('insert failed'), { code: '23505' });
      mockSingle.mockResolvedValueOnce({ data: null, error: dbError });

      await expect(
        getOrCreateConversation('listing-a', 'buyer-b', 'seller-c'),
      ).rejects.toBe(dbError);
    });
  });

  describe('fetchConversations', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    /** Set before `stubConversationListQuery` / `fetchConversations` in each test */
    let messagesByConversationId: Record<string, unknown[]>;

    function stubConversationListQuery(result: { data: unknown; error: unknown }) {
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'conversations') {
          return {
            select: jest.fn(() => ({
              or: jest.fn(() => ({
                order: jest.fn().mockResolvedValue(result),
              })),
            })),
          };
        }
        if (table === 'messages') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn((_col: string, conversationId: string) => ({
                order: jest.fn(() => ({
                  limit: jest.fn().mockImplementation(() =>
                    Promise.resolve({
                      data: messagesByConversationId[conversationId] ?? [],
                    }),
                  ),
                })),
              })),
            })),
          };
        }
        return {};
      });
    }

    it('throws when the conversations query returns an error', async () => {
      messagesByConversationId = {};
      const err = Object.assign(new Error('query failed'), { code: 'PGRST301' });
      stubConversationListQuery({ data: null, error: err });

      await expect(fetchConversations('user-1')).rejects.toBe(err);
      expect(supabase.from).toHaveBeenCalledWith('conversations');
    });

    it('returns an empty array when there are no conversations', async () => {
      messagesByConversationId = {};
      stubConversationListQuery({ data: null, error: null });

      const rows = await fetchConversations('user-1');

      expect(rows).toEqual([]);
    });

    it('merges each conversation with the latest message from the messages table', async () => {
      const convoA = {
        id: 'convo-a',
        listing_id: 'list-1',
        buyer_id: 'b1',
        seller_id: 's1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        listing: { id: 'list-1', title: 'Chair', price: 10, images: [] },
        buyer: { id: 'b1', username: 'b', display_name: 'B', avatar_url: null },
        seller: { id: 's1', username: 's', display_name: 'S', avatar_url: null },
      };
      const convoB = {
        id: 'convo-b',
        listing_id: 'list-2',
        buyer_id: 'b2',
        seller_id: 's2',
        created_at: '2025-01-03T00:00:00Z',
        updated_at: '2025-01-04T00:00:00Z',
        listing: { id: 'list-2', title: 'Desk', price: 20, images: ['x'] },
        buyer: { id: 'b2', username: 'b2', display_name: 'B2', avatar_url: null },
        seller: { id: 's2', username: 's2', display_name: 'S2', avatar_url: null },
      };

      const lastForA = {
        id: 'msg-1',
        conversation_id: 'convo-a',
        sender_id: 'b1',
        body: 'Still available?',
        created_at: '2025-01-05T00:00:00Z',
      };

      messagesByConversationId = {
        'convo-a': [lastForA],
        'convo-b': [],
      };

      stubConversationListQuery({
        data: [convoA, convoB],
        error: null,
      });

      const rows = await fetchConversations('user-xyz');

      expect(supabase.from).toHaveBeenCalledWith('conversations');
      expect(supabase.from).toHaveBeenCalledWith('messages');

      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({ ...convoA, last_message: lastForA });
      expect(rows[1]).toEqual({ ...convoB, last_message: null });
    });
  });

  describe('fetchMessages', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    function stubMessagesForConversation(result: { data: unknown; error: unknown }) {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue(result),
          })),
        })),
      });
    }

    it('throws when the messages query returns an error', async () => {
      const err = Object.assign(new Error('messages query failed'), { code: 'PGRST116' });
      stubMessagesForConversation({ data: null, error: err });

      await expect(fetchMessages('convo-99')).rejects.toBe(err);
      expect(supabase.from).toHaveBeenCalledWith('messages');
    });

    it('returns an empty array when data is null', async () => {
      stubMessagesForConversation({ data: null, error: null });

      const rows = await fetchMessages('convo-99');

      expect(rows).toEqual([]);
    });

    it('returns messages ordered by the query (ascending created_at)', async () => {
      const msgs = [
        {
          id: 'm1',
          conversation_id: 'convo-99',
          sender_id: 'u1',
          body: 'Hi',
          created_at: '2025-01-01T10:00:00Z',
        },
        {
          id: 'm2',
          conversation_id: 'convo-99',
          sender_id: 'u2',
          body: 'Hello back',
          created_at: '2025-01-01T11:00:00Z',
        },
      ];
      stubMessagesForConversation({ data: msgs, error: null });

      const rows = await fetchMessages('convo-99');

      expect(rows).toEqual(msgs);
      const table = (supabase.from as jest.Mock).mock.results[0].value;
      expect(table.select).toHaveBeenCalledWith('*');
      const eqChain = table.select.mock.results[0].value;
      expect(eqChain.eq).toHaveBeenCalledWith('conversation_id', 'convo-99');
      const orderMock = eqChain.eq.mock.results[0].value.order;
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: true });
    });
  });

  describe('sendMessage', () => {
    const mockInsertSingle = jest.fn();
    const mockUpdateEq = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      mockUpdateEq.mockResolvedValue({ error: null });
    });

    function stubSendMessageFlow(insertResult: { data: unknown; error: unknown }) {
      mockInsertSingle.mockResolvedValue(insertResult);
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'messages') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: mockInsertSingle,
              })),
            })),
          };
        }
        if (table === 'conversations') {
          return {
            update: jest.fn(() => ({
              eq: mockUpdateEq,
            })),
          };
        }
        return {};
      });
    }

    it('throws when inserting the message fails', async () => {
      const err = Object.assign(new Error('insert failed'), { code: '23505' });
      stubSendMessageFlow({ data: null, error: err });

      await expect(sendMessage('convo-1', 'user-a', 'Hello')).rejects.toBe(err);
      expect(supabase.from).toHaveBeenCalledWith('messages');
      expect(supabase.from).not.toHaveBeenCalledWith('conversations');
    });

    it('returns the inserted row and updates the conversation updated_at', async () => {
      const row = {
        id: 'msg-new',
        conversation_id: 'convo-1',
        sender_id: 'user-a',
        body: 'Hello',
        created_at: '2025-06-01T12:00:00.000Z',
      };
      stubSendMessageFlow({ data: row, error: null });

      const result = await sendMessage('convo-1', 'user-a', 'Hello');

      expect(result).toEqual(row);

      expect(supabase.from).toHaveBeenCalledWith('messages');
      const messagesTable = (supabase.from as jest.Mock).mock.results[0].value;
      const insertPayload = messagesTable.insert.mock.calls[0][0];
      expect(insertPayload).toEqual({
        conversation_id: 'convo-1',
        sender_id: 'user-a',
        body: 'Hello',
      });

      expect(supabase.from).toHaveBeenCalledWith('conversations');
      const conversationsTable = (supabase.from as jest.Mock).mock.results[1].value;
      const updatePayload = conversationsTable.update.mock.calls[0][0];
      expect(updatePayload).toEqual(
        expect.objectContaining({
          updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        }),
      );
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'convo-1');
    });
  });

  describe('subscribeToMessages', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('subscribes to INSERTs on messages for this conversation and returns unsubscribe', () => {
      const subscribedChannel = { __tag: 'realtime-channel' };
      const channelObj = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnValue(subscribedChannel),
      };
      (supabase.channel as jest.Mock).mockReturnValue(channelObj);

      const onMessage = jest.fn();
      const unsubscribe = subscribeToMessages('convo-42', onMessage);

      expect(supabase.channel).toHaveBeenCalledWith('messages:convo-42');
      expect(channelObj.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'conversation_id=eq.convo-42',
        },
        expect.any(Function),
      );
      expect(channelObj.subscribe).toHaveBeenCalled();

      unsubscribe();
      expect(supabase.removeChannel).toHaveBeenCalledWith(subscribedChannel);
    });

    it('forwards payload.new to onMessage when realtime fires', () => {
      const channelObj = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      };
      (supabase.channel as jest.Mock).mockReturnValue(channelObj);

      const onMessage = jest.fn();
      subscribeToMessages('convo-42', onMessage);

      const handler = channelObj.on.mock.calls[0][2] as (payload: { new: unknown }) => void;
      const msg = {
        id: 'm1',
        conversation_id: 'convo-42',
        sender_id: 'u1',
        body: 'ping',
        created_at: '2025-01-01T00:00:00Z',
      };
      handler({ new: msg });

      expect(onMessage).toHaveBeenCalledWith(msg);
    });
  });
});
