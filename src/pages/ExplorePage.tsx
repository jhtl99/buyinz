import { useState, useRef } from "react";
import { Search, LayoutGrid, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EXPLORE_POSTS } from "@/data/mockData";
import type { SalePost } from "@/data/mockData";

const SHELVES = [
  { id: "All",         label: "All Shelves",  emoji: "🏪" },
  { id: "Furniture",   label: "Furniture",    emoji: "🛋️" },
  { id: "Clothing",    label: "Clothing",     emoji: "👗" },
  { id: "Electronics", label: "Electronics",  emoji: "📱" },
  { id: "Books",       label: "Books",        emoji: "📚" },
  { id: "Decor",       label: "Decor",        emoji: "🪴" },
  { id: "Other",       label: "Other",        emoji: "📦" },
] as const;

type ShelfId = (typeof SHELVES)[number]["id"];

const TRENDING_TAGS = [
  "#VintageSteelers",
  "#MCM",
  "#PittMovingSale",
  "#ThriftFinds",
  "#Vinyl",
  "#ISO",
];

function ExploreCard({ post }: { post: SalePost }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer bg-muted w-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={post.images[0]}
        alt={post.title}
        className="w-full object-cover block"
        style={{ aspectRatio: "3/4" }}
        loading="lazy"
      />
      {/* Hover overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 flex flex-col justify-end p-2.5 transition-opacity duration-200",
          hovered ? "opacity-100" : "opacity-0"
        )}
      >
        <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{post.title}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-white/80 text-xs">@{post.seller.username}</span>
          <span className="brand-gradient text-white text-xs font-bold px-2 py-0.5 rounded-full">
            ${post.price}
          </span>
        </div>
      </div>
      {/* Always-visible price pill */}
      <div
        className={cn(
          "absolute top-2 right-2 brand-gradient text-white text-xs font-bold px-2 py-0.5 rounded-full shadow transition-opacity",
          hovered ? "opacity-0" : "opacity-100"
        )}
      >
        ${post.price}
      </div>
    </div>
  );
}

export function ExplorePage() {
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ShelfId>("All");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [shelvesOpen, setShelvesOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeShelf = SHELVES.find((s) => s.id === activeCategory)!;

  const filtered = EXPLORE_POSTS.filter((p) => {
    const matchesCat = activeCategory === "All" || p.category === activeCategory;
    const matchesSearch =
      search === "" ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.seller.username.toLowerCase().includes(search.toLowerCase());
    const matchesTag = activeTag === null || p.hashtags.includes(activeTag);
    return matchesCat && matchesSearch && matchesTag;
  });

  // True masonry: split into 2 columns
  const col1: SalePost[] = [];
  const col2: SalePost[] = [];
  filtered.forEach((p, i) => (i % 2 === 0 ? col1 : col2).push(p));

  const showTagDropdown = searchFocused || search.length > 0;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 glass px-4 pt-4 pb-3 flex flex-col gap-2">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder="Search Buyinz listings..."
            className="w-full bg-muted border border-border rounded-full pl-9 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
          {search.length > 0 && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onMouseDown={() => setSearch("")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Hashtag dropdown — only shown when search is focused */}
        {showTagDropdown && (
          <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Trending in Pittsburgh
            </p>
            {TRENDING_TAGS.map((tag) => (
              <button
                key={tag}
                onMouseDown={() => {
                  setActiveTag(activeTag === tag ? null : tag);
                  setSearch("");
                  inputRef.current?.blur();
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm font-medium transition-colors",
                  activeTag === tag
                    ? "text-primary bg-primary/8"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Active tag pill + Shelves button row */}
        <div className="flex items-center gap-2">
          {/* Active tag pill */}
          {activeTag && (
            <button
              onClick={() => setActiveTag(null)}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full brand-gradient text-white"
            >
              {activeTag}
              <X className="w-3 h-3" />
            </button>
          )}

          <div className="flex-1" />

          {/* Shelves button */}
          <div className="relative">
            <button
              onClick={() => setShelvesOpen((o) => !o)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full border transition-all",
                shelvesOpen || activeCategory !== "All"
                  ? "bg-foreground text-background border-foreground"
                  : "bg-muted text-muted-foreground border-border hover:text-foreground"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {activeShelf.emoji} {activeShelf.label}
              <ChevronDown
                className={cn("w-3 h-3 transition-transform", shelvesOpen && "rotate-180")}
              />
            </button>

            {/* Shelf dropdown */}
            {shelvesOpen && (
              <div className="absolute right-0 top-full mt-1.5 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 min-w-[180px] animate-in fade-in slide-in-from-top-1 duration-150">
                <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Browse Shelves
                </p>
                {SHELVES.map((shelf) => (
                  <button
                    key={shelf.id}
                    onClick={() => {
                      setActiveCategory(shelf.id);
                      setShelvesOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 text-sm font-medium flex items-center gap-2.5 transition-colors",
                      activeCategory === shelf.id
                        ? "text-primary bg-primary/8"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span>{shelf.emoji}</span>
                    <span>{shelf.label}</span>
                    {activeCategory === shelf.id && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Masonry Grid — fixed aspect ratio cards, no overlap */}
      <div className="px-3 py-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-sm font-medium">No listings found</p>
            <p className="text-xs">Try a different search or shelf</p>
          </div>
        ) : (
          <div className="flex gap-2 items-start">
            {/* Column 1 */}
            <div className="flex-1 flex flex-col gap-2">
              {col1.map((post) => (
                <ExploreCard key={post.id} post={post} />
              ))}
            </div>
            {/* Column 2 — offset slightly */}
            <div className="flex-1 flex flex-col gap-2 mt-6">
              {col2.map((post) => (
                <ExploreCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
