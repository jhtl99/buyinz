import { useState } from 'react';
import { motion } from 'framer-motion';
import { Conversation } from '@/types/listing';
import { useMessages } from '@/context/MessagesContext';
import { ChatThread } from './ChatThread';

type ChatTab = 'buying' | 'selling';

const TAB_COLORS = {
  buying: {
    accent: 'hsl(220, 70%, 55%)',
    accentMuted: 'hsla(220, 70%, 55%, 0.15)',
    pill: 'hsla(220, 70%, 55%, 0.2)',
  },
  selling: {
    accent: 'hsl(0, 70%, 55%)',
    accentMuted: 'hsla(0, 70%, 55%, 0.15)',
    pill: 'hsla(0, 70%, 55%, 0.2)',
  },
} as const;

export function ChatsView() {
  const [activeTab, setActiveTab] = useState<ChatTab>('buying');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const { conversations } = useMessages();

  const buyingChats = conversations.filter(c => c.type === 'buying');
  const sellingChats = conversations.filter(c => c.type === 'selling');
  const currentChats = activeTab === 'buying' ? buyingChats : sellingChats;
  const colors = TAB_COLORS[activeTab];

  if (selectedConversation) {
    return (
      <ChatThread
        conversation={selectedConversation}
        mode={activeTab}
        onBack={() => setSelectedConversation(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-[var(--space-sm)] py-[var(--space-sm)]">
        <h1 className="text-[length:var(--text-heading)] font-bold text-foreground mb-[var(--space-sm)]">Messages</h1>
        
        <div className="flex bg-secondary rounded-2xl p-1">
          {(['buying', 'selling'] as ChatTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 relative py-2.5 rounded-xl text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="chatTab"
                  className="absolute inset-0 rounded-xl"
                  style={{ backgroundColor: TAB_COLORS[tab].pill }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10">{tab}</span>
              {tab === 'buying' && buyingChats.some(c => c.unread) && (
                <span
                  className="relative z-10 ml-1 w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: TAB_COLORS.buying.accent }}
                />
              )}
              {tab === 'selling' && sellingChats.some(c => c.unread) && (
                <span
                  className="relative z-10 ml-1 w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: TAB_COLORS.selling.accent }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-[var(--space-sm)] pb-[var(--nav-padding)]">
        {currentChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-[10vh]">
            <div className="w-[var(--size-thumbnail)] h-[var(--size-thumbnail)] rounded-full bg-secondary flex items-center justify-center mb-[var(--space-sm)]">
              <span className="text-[length:var(--text-heading)]">💬</span>
            </div>
            <p className="text-muted-foreground text-center">
              No {activeTab} conversations yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentChats.map((chat, index) => {
              const lastMsg = chat.messages[chat.messages.length - 1];
              return (
                <motion.button
                  key={chat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedConversation(chat)}
                  className="w-full flex items-start gap-3 p-3 bg-card rounded-2xl hover:bg-card-elevated transition-colors text-left"
                >
                  <div className="relative w-[var(--size-thumbnail)] h-[var(--size-thumbnail)] rounded-xl overflow-hidden flex-shrink-0">
                    <img 
                      src={chat.listing.image} 
                      alt={chat.listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground truncate">
                          {chat.listing.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          @{chat.listing.seller.name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {lastMsg?.text}
                        </p>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {lastMsg?.timestamp}
                        </span>
                        {chat.unread && (
                          <span
                            className="w-2 h-2 rounded-full mt-1"
                            style={{ backgroundColor: colors.accent }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
