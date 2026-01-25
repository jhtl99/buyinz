import { useState } from 'react';
import { motion } from 'framer-motion';
import { mockConversations } from '@/data/mockListings';
import { Conversation } from '@/types/listing';

type ChatTab = 'buying' | 'selling';

export function ChatsView() {
  const [activeTab, setActiveTab] = useState<ChatTab>('buying');

  const buyingChats = mockConversations;
  const sellingChats: Conversation[] = []; // Empty for MVP

  const currentChats = activeTab === 'buying' ? buyingChats : sellingChats;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-4">
        <h1 className="text-2xl font-bold text-foreground mb-4">Messages</h1>
        
        {/* Tab Switcher */}
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
                  className="absolute inset-0 bg-card rounded-xl"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10">{tab}</span>
              {tab === 'buying' && buyingChats.some(c => c.unread) && (
                <span className="relative z-10 ml-1 w-2 h-2 bg-primary rounded-full inline-block" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {currentChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-muted-foreground text-center">
              No {activeTab} conversations yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentChats.map((chat, index) => (
              <motion.button
                key={chat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="w-full flex items-start gap-3 p-3 bg-card rounded-2xl hover:bg-card-elevated transition-colors text-left"
              >
                {/* Listing Thumbnail */}
                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  <img 
                    src={chat.listing.image} 
                    alt={chat.listing.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground truncate">
                        {chat.listing.title}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.lastMessage}
                      </p>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {chat.timestamp}
                      </span>
                      {chat.unread && (
                        <span className="w-2 h-2 bg-primary rounded-full mt-1" />
                      )}
                    </div>
                  </div>
                  
                  {/* Offer Status */}
                  {chat.offerStatus && (
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                        chat.offerStatus === 'pending' 
                          ? 'bg-warning/20 text-warning' 
                          : chat.offerStatus === 'accepted'
                            ? 'bg-success/20 text-success'
                            : 'bg-destructive/20 text-destructive'
                      }`}>
                        {chat.offerStatus === 'pending' && '⏳'}
                        {chat.offerStatus === 'accepted' && '✓'}
                        {chat.offerStatus === 'declined' && '✕'}
                        ${chat.offerAmount} offer {chat.offerStatus}
                      </span>
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
