import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Conversation, Listing, Message } from '@/types/listing';
import { mockConversations } from '@/data/mockListings';

export const CURRENT_USER_ID = 'me';

interface MessagesContextValue {
  conversations: Conversation[];
  startConversation: (listing: Listing, initialMessage: string) => string;
  sendMessage: (conversationId: string, text: string) => void;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);

  const startConversation = useCallback((listing: Listing, initialMessage: string): string => {
    const existing = conversations.find(c => c.listing.id === listing.id);
    if (existing) {
      const msg: Message = {
        id: `m-${Date.now()}`,
        senderId: CURRENT_USER_ID,
        text: initialMessage,
        timestamp: 'Just now',
      };
      setConversations(prev =>
        prev.map(c =>
          c.id === existing.id
            ? { ...c, messages: [...c.messages, msg], unread: false }
            : c
        )
      );
      return existing.id;
    }

    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      listing,
      messages: [
        {
          id: `m-${Date.now()}`,
          senderId: CURRENT_USER_ID,
          text: initialMessage,
          timestamp: 'Just now',
        },
      ],
      unread: false,
    };
    setConversations(prev => [newConv, ...prev]);
    return newConv.id;
  }, [conversations]);

  const sendMessage = useCallback((conversationId: string, text: string) => {
    const msg: Message = {
      id: `m-${Date.now()}`,
      senderId: CURRENT_USER_ID,
      text,
      timestamp: 'Just now',
    };
    setConversations(prev =>
      prev.map(c =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, msg] }
          : c
      )
    );
  }, []);

  return (
    <MessagesContext.Provider value={{ conversations, startConversation, sendMessage }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessages must be used within MessagesProvider');
  return ctx;
}
