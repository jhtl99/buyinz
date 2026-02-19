import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMessages } from "@/contexts/MessagesContext";
import type { Conversation } from "@/data/mockData";

const MODE_COLORS = {
  buying: {
    self: "bg-blue-500/15 dark:bg-blue-500/20",
    other: "bg-secondary",
    send: "bg-blue-500 hover:bg-blue-600",
    sendInactive: "bg-muted text-muted-foreground",
  },
  selling: {
    self: "bg-rose-500/15 dark:bg-rose-500/20",
    other: "bg-secondary",
    send: "bg-rose-500 hover:bg-rose-600",
    sendInactive: "bg-muted text-muted-foreground",
  },
} as const;

interface ChatThreadProps {
  conversation: Conversation;
  mode: "buying" | "selling";
  onBack: () => void;
}

export function ChatThread({ conversation, mode, onBack }: ChatThreadProps) {
  const [input, setInput] = useState("");
  const { sendMessage, conversations } = useMessages();
  const scrollRef = useRef<HTMLDivElement>(null);
  const colors = MODE_COLORS[mode];

  const live = conversations.find((c) => c.id === conversation.id) ?? conversation;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [live.messages.length]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage(conversation.id, text);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasText = input.trim().length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
          <img src={live.listing.image} alt={live.listing.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm text-foreground truncate">{live.listing.title}</h2>
          <p className="text-xs text-muted-foreground">@{live.otherUser.username}</p>
        </div>
        <span className="text-xs font-semibold brand-gradient text-white px-2.5 py-1 rounded-full">
          ${live.listing.price}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {live.messages.map((msg) => {
          const isSelf = msg.senderId === "me";
          return (
            <div key={msg.id} className={cn("flex", isSelf ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] px-3.5 py-2.5 rounded-2xl",
                  isSelf ? `rounded-br-md ${colors.self}` : `rounded-bl-md ${colors.other}`,
                )}
              >
                <p className="text-sm text-foreground leading-relaxed">{msg.text}</p>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{msg.timestamp}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-secondary rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow max-h-24"
          />
          <button
            onClick={handleSend}
            disabled={!hasText}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
              hasText ? `${colors.send} text-white` : colors.sendInactive,
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
