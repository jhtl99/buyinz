import { useState } from "react";
import { Heart, MessageCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ISOPost } from "@/data/mockData";

export function ISOPostCard({ post: initialPost }: { post: ISOPost }) {
  const [post, setPost] = useState(initialPost);

  const toggleLike = () => {
    setPost((p) => ({
      ...p,
      liked: !p.liked,
      likes: p.liked ? p.likes - 1 : p.likes + 1,
    }));
  };

  return (
    <article className="iso-bg rounded-2xl overflow-hidden shadow-sm border border-primary/20">
      {/* Seller Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <img
          src={post.seller.avatar}
          alt={post.seller.displayName}
          className="w-9 h-9 rounded-full border border-border bg-muted"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground leading-tight truncate">
            {post.seller.displayName}
          </p>
          <p className="text-xs text-muted-foreground">@{post.seller.username} · {post.createdAt}</p>
        </div>
        {/* ISO Badge */}
        <span className="text-xs font-bold px-2.5 py-1 rounded-full brand-gradient text-white shadow-sm">
          ISO
        </span>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {/* Search icon + title */}
        <div className="flex items-start gap-2 mb-2">
          <Search className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <h3 className="font-semibold text-foreground text-sm leading-snug">{post.title}</h3>
        </div>

        <p className="text-sm text-foreground/80 leading-relaxed mb-3 pl-6">
          {post.description}
        </p>

        {/* Budget + Hashtags */}
        <div className="flex flex-wrap items-center gap-2 pl-6 mb-3">
          {post.budget && (
            <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/30 px-2.5 py-0.5 rounded-full">
              Budget: up to ${post.budget}
            </span>
          )}
          {post.hashtags.map((tag) => (
            <span key={tag} className="text-xs text-primary font-medium hover:underline cursor-pointer">
              {tag}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 border-t border-primary/20 pt-3">
          <button
            onClick={toggleLike}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all",
              post.liked
                ? "text-rose-500 bg-rose-500/10"
                : "text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
            )}
          >
            <Heart className={cn("w-4 h-4", post.liked && "fill-current")} />
            {post.likes}
          </button>

          <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <MessageCircle className="w-4 h-4" />
            {post.comments}
          </button>

          <div className="flex-1" />

          <button className="text-xs font-semibold text-primary hover:underline transition-all">
            I have this →
          </button>
        </div>
      </div>
    </article>
  );
}
