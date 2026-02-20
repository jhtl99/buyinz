import { useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import { MOCK_FEED_POSTS } from "@/data/mockData";
import { SalePostCard } from "@/components/feed/SalePostCard";
import { ISOPostCard } from "@/components/feed/ISOPostCard";
import type { Post } from "@/data/mockData";

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 300;

const variants = {
  enter: (dir: number) => ({
    rotateX: dir > 0 ? 45 : -45,
    y: dir > 0 ? "40%" : "-40%",
    opacity: 0,
    scale: 0.85,
  }),
  center: {
    rotateX: 0,
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 26 },
  },
  exit: (dir: number) => ({
    rotateX: dir > 0 ? -45 : 45,
    y: dir > 0 ? "-30%" : "30%",
    opacity: 0,
    scale: 0.85,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  }),
};

function PeekCard({ post, position }: { post: Post; position: "above" | "below" }) {
  const isAbove = position === "above";
  return (
    <div
      className="absolute left-3 right-3 z-0 pointer-events-none"
      style={{
        [isAbove ? "bottom" : "top"]: "100%",
        [isAbove ? "marginBottom" : "marginTop"]: "8px",
        height: "72px",
        filter: "blur(1px)",
        opacity: 0.6,
        transform: `scale(0.92) rotateX(${isAbove ? "12deg" : "-12deg"})`,
        transformOrigin: isAbove ? "bottom center" : "top center",
        overflow: "hidden",
        borderRadius: "1rem",
      }}
    >
      {post.type === "sale" ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden h-full">
          <div className="flex items-center gap-3 px-4 py-3">
            <img src={post.seller.avatar} alt="" className="w-9 h-9 rounded-full border border-border bg-muted" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground leading-tight truncate">{post.seller.displayName}</p>
              <p className="text-xs text-muted-foreground">@{post.seller.username}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="iso-bg rounded-2xl overflow-hidden border border-primary/20 h-full">
          <div className="flex items-center gap-3 px-4 py-3">
            <img src={post.seller.avatar} alt="" className="w-9 h-9 rounded-full border border-border bg-muted" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground leading-tight truncate">{post.seller.displayName}</p>
              <p className="text-xs text-muted-foreground">@{post.seller.username}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function HomePage() {
  const [[currentIndex, direction], setPage] = useState([0, 0]);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef(0);
  const isAnimating = useRef(false);

  const posts = MOCK_FEED_POSTS;
  const post = posts[currentIndex];
  const prevPost = currentIndex > 0 ? posts[currentIndex - 1] : null;
  const nextPost = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null;

  const paginate = useCallback(
    (dir: number) => {
      if (isAnimating.current) return;
      const next = currentIndex + dir;
      if (next < 0 || next >= posts.length) return;
      isAnimating.current = true;
      setPage([next, dir]);
    },
    [currentIndex, posts.length],
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null) return;
      const dy = touchStartY.current - e.changedTouches[0].clientY;
      const dt = Date.now() - touchStartTime.current;
      const velocity = (Math.abs(dy) / (dt || 1)) * 1000;

      if (dy > SWIPE_THRESHOLD || (dy > 0 && velocity > VELOCITY_THRESHOLD)) {
        paginate(1);
      } else if (dy < -SWIPE_THRESHOLD || (dy < 0 && velocity > VELOCITY_THRESHOLD)) {
        paginate(-1);
      }
      touchStartY.current = null;
    },
    [paginate],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (Math.abs(e.deltaY) < 30) return;
      paginate(e.deltaY > 0 ? 1 : -1);
    },
    [paginate],
  );

  const mainCard = useMemo(() => {
    if (post.type === "sale") return <SalePostCard post={post} fill />;
    return <ISOPostCard post={post} />;
  }, [post]);

  return (
    <div
      className="relative h-screen overflow-hidden"
      style={{ perspective: "1200px" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Notification Bell */}
      <div className="fixed top-4 right-4 z-30">
        <button className="relative p-2 rounded-full bg-background/80 backdrop-blur hover:bg-muted transition-colors shadow">
          <Bell className="w-5 h-5 text-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>
      </div>

      {/* Carousel */}
      <div
        className="h-full flex items-center justify-center px-3"
        style={{ transformStyle: "preserve-3d" }}
      >
        <AnimatePresence
          initial={false}
          custom={direction}
          mode="popLayout"
          onExitComplete={() => {
            isAnimating.current = false;
          }}
        >
          <motion.div
            key={post.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full relative"
            style={{
              transformStyle: "preserve-3d",
              maxHeight: "calc(100dvh - 88px)",
            }}
          >
            {prevPost && <PeekCard post={prevPost} position="above" />}
            {mainCard}
            {nextPost && <PeekCard post={nextPost} position="below" />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
