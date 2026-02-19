import { Bell } from "lucide-react";
import { MOCK_FEED_POSTS } from "@/data/mockData";
import { SalePostCard } from "@/components/feed/SalePostCard";
import { ISOPostCard } from "@/components/feed/ISOPostCard";

export function HomePage() {
  return (
    <div className="relative h-screen overflow-hidden">
      {/* Notification Bell - fixed top right */}
      <div className="fixed top-4 right-4 z-30">
        <button className="relative p-2 rounded-full bg-background/80 backdrop-blur hover:bg-muted transition-colors shadow">
          <Bell className="w-5 h-5 text-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>
      </div>

      {/* Snap scroll feed */}
      <div
        className="h-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {MOCK_FEED_POSTS.map((post) => (
          <div
            key={post.id}
            className="snap-start snap-always flex items-center justify-center px-3 pt-2 pb-0"
            style={{ height: "calc(100dvh - 72px)" }}
          >
            {post.type === "sale" ? (
              <SalePostCard post={post} />
            ) : (
              <ISOPostCard post={post} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
