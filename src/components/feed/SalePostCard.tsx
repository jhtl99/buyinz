import { useState, useRef } from "react";
import { Bookmark, DollarSign, MapPin, Clock, Tag, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SalePost } from "@/data/mockData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const CONDITION_COLORS: Record<SalePost["condition"], string> = {
  New: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  "Like New": "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  Good: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  Fair: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

const MOCK_LOCATION = { zip: "15222", distance: "1.4 miles away", neighborhood: "Strip District" };

export function SalePostCard({ post: initialPost, fill }: { post: SalePost; fill?: boolean }) {
  const [post] = useState(initialPost);
  const [imgIndex, setImgIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [message, setMessage] = useState("");
  const [msgFocused, setMsgFocused] = useState(false);

  // Touch handling for swipe left/right on images
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dx > 8 || dy > 8) isDragging.current = true;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - (touchStartY.current ?? 0));

    if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
      // Horizontal swipe — change image
      if (dx < 0) {
        setImgIndex((i) => (i + 1) % post.images.length);
      } else {
        setImgIndex((i) => (i - 1 + post.images.length) % post.images.length);
      }
    } else if (!isDragging.current) {
      // Tap — open detail
      setDetailOpen(true);
    }

    touchStartX.current = null;
    touchStartY.current = null;
    isDragging.current = false;
  };

  // Mouse click fallback for desktop
  const handleImageClick = () => {
    setDetailOpen(true);
  };

  return (
    <>
      <article className={cn(
        "bg-card border border-border rounded-2xl overflow-hidden shadow-sm w-full",
        fill && "flex flex-col h-full"
      )}>
        {/* Seller Header */}
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0">
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
          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", CONDITION_COLORS[post.condition])}>
            {post.condition}
          </span>
        </div>

        {/* Image — tap to open detail, swipe to change image */}
        <div
          className={cn(
            "relative bg-muted overflow-hidden cursor-pointer select-none",
            fill ? "flex-1 min-h-0" : "aspect-square"
          )}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleImageClick}
        >
          <img
            src={post.images[imgIndex]}
            alt={post.title}
            className="w-full h-full object-cover transition-opacity duration-200"
            draggable={false}
          />

          {/* Dot indicators — bottom left of image */}
          {post.images.length > 1 && (
            <div className="absolute bottom-3 left-3 flex gap-1.5">
              {post.images.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    i === imgIndex ? "bg-white scale-125" : "bg-white/50"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom row: save + title on left, price on right */}
        <div className="px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
          {/* Left: save + title */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSaved((s) => !s)}
              className={cn(
                "p-1.5 rounded-full transition-all flex-shrink-0",
                saved
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Bookmark className={cn("w-5 h-5", saved && "fill-current")} />
            </button>
            <h3 className="font-semibold text-foreground text-sm leading-snug truncate">
              {post.title}
            </h3>
          </div>

          {/* Right: price — large */}
          <span className="brand-gradient text-white text-xl font-extrabold px-4 py-1.5 rounded-full shadow flex-shrink-0">
            {post.price === 0 ? "Offer" : `$${post.price}`}
          </span>
        </div>
      </article>

      {/* ── Detail Sheet ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-sm w-full p-0 overflow-hidden rounded-2xl gap-0">
          {/* Image */}
          <div className="relative aspect-[4/3] bg-muted overflow-hidden">
            <img
              src={post.images[imgIndex]}
              alt={post.title}
              className="w-full h-full object-cover"
            />
            <span className={cn("absolute top-3 right-12 text-xs font-semibold px-2 py-0.5 rounded-full border", CONDITION_COLORS[post.condition])}>
              {post.condition}
            </span>
          </div>

          {/* Content */}
          <div className="px-5 py-4 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base leading-snug text-left">{post.title}</DialogTitle>
            </DialogHeader>

            {/* Price */}
            <div className="flex items-center gap-2">
              <span className="brand-gradient text-white text-lg font-extrabold px-4 py-1 rounded-full shadow">
                {post.price === 0 ? "Make Offer" : `$${post.price}`}
              </span>
            </div>

            {/* Seller */}
            <div className="flex items-center gap-2">
              <img
                src={post.seller.avatar}
                alt={post.seller.displayName}
                className="w-7 h-7 rounded-full border border-border bg-muted"
              />
              <div>
                <p className="text-xs font-semibold text-foreground">{post.seller.displayName}</p>
                <p className="text-xs text-muted-foreground">@{post.seller.username}</p>
              </div>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>{MOCK_LOCATION.neighborhood}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Tag className="w-3.5 h-3.5 text-primary" />
                <span>ZIP {MOCK_LOCATION.zip}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium text-foreground">{MOCK_LOCATION.distance}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Listed {post.createdAt}</span>
              </div>
            </div>

            {post.description && (
              <p className="text-sm text-foreground/80 leading-relaxed">{post.description}</p>
            )}

            {/* Hashtags */}
            {post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {post.hashtags.map((tag) => (
                  <span key={tag} className="text-xs text-primary font-medium hover:underline cursor-pointer">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* CTA */}
            <button
              onClick={() => { setDetailOpen(false); setOfferOpen(true); }}
              className="w-full flex items-center justify-center gap-1.5 text-sm h-10 rounded-full brand-gradient border-0 font-semibold"
              style={{ color: "white" }}
            >
              <DollarSign className="w-4 h-4" />
              Make an Offer
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Offer Sheet ── */}
      <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
        <DialogContent className="max-w-sm w-full rounded-2xl gap-0 p-0 overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-5 pb-3 border-b border-border">
            <DialogHeader>
              <DialogTitle className="text-base">Make an Offer</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground mt-1 truncate">{post.title}</p>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Listed price reference */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Listed price</span>
              <span className="font-semibold text-foreground">
                {post.price === 0 ? "Open to offers" : `$${post.price}`}
              </span>
            </div>

            {/* Offer amount */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Your Offer</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  className="pl-7 text-sm font-semibold"
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Message (optional)</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onFocus={() => setMsgFocused(true)}
                onBlur={() => setMsgFocused(false)}
                rows={3}
                className="text-sm resize-none"
                placeholder={msgFocused || message ? "" : "I'd like to offer..."}
              />
            </div>

            {/* Submit */}
            <button
              disabled={!offerAmount}
              onClick={() => setOfferOpen(false)}
              className={cn(
                "w-full flex items-center justify-center gap-1.5 text-sm h-10 rounded-full font-semibold transition-opacity",
                offerAmount ? "brand-gradient opacity-100" : "bg-muted opacity-50 cursor-not-allowed"
              )}
              style={offerAmount ? { color: "white" } : undefined}
            >
              <Send className="w-4 h-4" />
              Send Offer
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
