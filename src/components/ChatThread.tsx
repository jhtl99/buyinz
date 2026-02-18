import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send } from 'lucide-react';
import { Conversation } from '@/types/listing';
import { useMessages, CURRENT_USER_ID } from '@/context/MessagesContext';

const MODE_COLORS = {
  buying: {
    self: 'hsla(220, 60%, 45%, 0.25)',
    other: 'hsla(0, 55%, 45%, 0.2)',
    accent: 'hsl(220, 70%, 55%)',
    sendActive: 'hsl(220, 70%, 55%)',
  },
  selling: {
    self: 'hsla(0, 55%, 45%, 0.25)',
    other: 'hsla(220, 60%, 45%, 0.2)',
    accent: 'hsl(0, 70%, 55%)',
    sendActive: 'hsl(0, 70%, 55%)',
  },
} as const;

interface ChatThreadProps {
  conversation: Conversation;
  mode: 'buying' | 'selling';
  onBack: () => void;
}

export function ChatThread({ conversation, mode, onBack }: ChatThreadProps) {
  const [input, setInput] = useState('');
  const { sendMessage, conversations } = useMessages();
  const scrollRef = useRef<HTMLDivElement>(null);
  const colors = MODE_COLORS[mode];

  const liveConversation = conversations.find(c => c.id === conversation.id) ?? conversation;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [liveConversation.messages.length]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage(conversation.id, text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasText = input.trim().length > 0;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-[var(--space-sm)] py-[var(--space-sm)] border-b border-border">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
          <img
            src={liveConversation.listing.image}
            alt={liveConversation.listing.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-foreground text-sm truncate">
            {liveConversation.listing.title}
          </h2>
          <p className="text-xs text-muted-foreground">
            @{liveConversation.listing.seller.name}
          </p>
        </div>
        <span
          className="text-xs font-medium px-2 py-1 rounded-full"
          style={{ backgroundColor: colors.accent + '22', color: colors.accent }}
        >
          ${liveConversation.listing.price}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-[var(--space-sm)] py-[var(--space-sm)] space-y-3"
      >
        {liveConversation.messages.map((msg, i) => {
          const isSelf = msg.senderId === CURRENT_USER_ID;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                  isSelf ? 'rounded-br-md' : 'rounded-bl-md'
                }`}
                style={{ backgroundColor: isSelf ? colors.self : colors.other }}
              >
                <p className="text-sm text-foreground leading-relaxed">{msg.text}</p>
                <p className="text-[0.625rem] text-muted-foreground mt-1 text-right">
                  {msg.timestamp}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="px-[var(--space-sm)] py-[var(--space-xs)] border-t border-border safe-bottom">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-secondary rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow max-h-24"
          />
          <button
            onClick={handleSend}
            disabled={!hasText}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200"
            style={{
              backgroundColor: hasText ? colors.sendActive : 'hsl(var(--secondary))',
              color: hasText ? '#fff' : 'hsl(var(--muted-foreground))',
              boxShadow: hasText ? `0 0 20px ${colors.sendActive}44` : 'none',
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
