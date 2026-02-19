import { useState } from "react";
import { cn } from "@/lib/utils";
import { useMessages } from "@/contexts/MessagesContext";
import { ChatThread } from "@/components/ChatThread";
import type { Conversation } from "@/data/mockData";

type ChatTab = "buying" | "selling";

const TAB_STYLES = {
  buying: {
    active: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    bubble: "bg-blue-500/10",
  },
  selling: {
    active: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
    bubble: "bg-rose-500/10",
  },
} as const;

export function MessagesPage() {
  const [activeTab, setActiveTab] = useState<ChatTab>("buying");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const { conversations } = useMessages();

  const buyingChats = conversations.filter((c) => c.type === "buying");
  const sellingChats = conversations.filter((c) => c.type === "selling");
  const currentChats = activeTab === "buying" ? buyingChats : sellingChats;
  const styles = TAB_STYLES[activeTab];

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
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-3 space-y-3">
        <h1 className="text-xl font-bold text-foreground">Messages</h1>

        <div className="flex bg-secondary rounded-xl p-1 gap-1">
          {(["buying", "selling"] as ChatTab[]).map((tab) => {
            const isActive = activeTab === tab;
            const hasUnread =
              tab === "buying"
                ? buyingChats.some((c) => c.unread)
                : sellingChats.some((c) => c.unread);
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 relative py-2 rounded-lg text-sm font-medium capitalize transition-all",
                  isActive ? TAB_STYLES[tab].active : "text-muted-foreground",
                )}
              >
                {tab}
                {hasUnread && (
                  <span
                    className={cn(
                      "ml-1.5 inline-block w-1.5 h-1.5 rounded-full",
                      TAB_STYLES[tab].dot,
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {currentChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-3xl mb-3">💬</span>
            <p className="text-muted-foreground text-sm">
              No {activeTab} conversations yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentChats.map((chat) => {
              const lastMsg = chat.messages[chat.messages.length - 1];
              return (
                <button
                  key={chat.id}
                  onClick={() => setSelectedConversation(chat)}
                  className="w-full flex items-start gap-3 p-3 bg-card border border-border rounded-xl hover:bg-muted/40 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                    <img
                      src={chat.listing.image}
                      alt={chat.listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate">
                          {chat.listing.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          @{chat.otherUser.username}
                        </p>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0 gap-1">
                        <span className="text-[10px] text-muted-foreground">
                          {lastMsg?.timestamp}
                        </span>
                        {chat.unread && (
                          <span className={cn("w-2 h-2 rounded-full", styles.dot)} />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {lastMsg?.senderId === "me" ? "You: " : ""}
                      {lastMsg?.text}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
