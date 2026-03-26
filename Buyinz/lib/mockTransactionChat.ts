import type { MessageRow } from '@/supabase/queries';

/** Scripted thread merged in the UI only (not written to `messages`); for rating-flow screens. */
export function buildMockTransactionMessages(
  conversationId: string,
  buyerId: string,
  sellerId: string,
): MessageRow[] {
  const base = Date.now() - 1000 * 60 * 45;
  const iso = (mins: number) => new Date(base + mins * 60_000).toISOString();

  return [
    {
      id: 'mock-msg-1',
      conversation_id: conversationId,
      sender_id: buyerId,
      body: 'Hey! Is this still available?',
      created_at: iso(0),
    },
    {
      id: 'mock-msg-2',
      conversation_id: conversationId,
      sender_id: sellerId,
      body: 'Yes — happy to meet up tomorrow afternoon if that works.',
      created_at: iso(3),
    },
    {
      id: 'mock-msg-3',
      conversation_id: conversationId,
      sender_id: buyerId,
      body: 'Perfect. I can do 3pm at the library steps.',
      created_at: iso(8),
    },
    {
      id: 'mock-msg-4',
      conversation_id: conversationId,
      sender_id: sellerId,
      body: 'Sounds good. Cash or Venmo is fine.',
      created_at: iso(12),
    },
    {
      id: 'mock-msg-5',
      conversation_id: conversationId,
      sender_id: buyerId,
      body: "Great — I'll bring cash. See you then!",
      created_at: iso(18),
    },
  ];
}
