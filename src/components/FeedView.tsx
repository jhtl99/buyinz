import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SwipeCard } from './SwipeCard';
import { ListingDetail } from './ListingDetail';
import { feedListings } from '@/data/mockListings';
import { Listing } from '@/types/listing';
import { X, ArrowUp, Heart, RotateCcw } from 'lucide-react';


export function FeedView() {
  const [listings, setListings] = useState<Listing[]>(feedListings);
  const [discardedListings, setDiscardedListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const handleSwipeLeft = useCallback(() => {
    if (listings.length === 0) return;
    const [removed, ...rest] = listings;
    setDiscardedListings(prev => [removed, ...prev]);
    setListings(rest);
  }, [listings]);

  const handleSwipeRight = useCallback(() => {
    if (listings.length === 0) return;
    setSelectedListing(listings[0]);
    setShowDetail(true);
  }, [listings]);

  const handleSwipeUp = useCallback(() => {
    if (listings.length === 0) return;
    const [skipped, ...rest] = listings;
    setListings([...rest, skipped]);
  }, [listings]);

  const handleTap = useCallback(() => {
    if (listings.length === 0) return;
    setSelectedListing(listings[0]);
    setShowDetail(true);
  }, [listings]);

  const handleMakeOffer = () => {
    const [, ...rest] = listings;
    setListings(rest);
    setShowDetail(false);
    setSelectedListing(null);
  };

  const handleUndo = () => {
    if (discardedListings.length === 0) return;
    const [lastDiscarded, ...rest] = discardedListings;
    setDiscardedListings(rest);
    setListings(prev => [lastDiscarded, ...prev]);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-[var(--space-md)] py-[var(--space-sm)]">
        <h1 className="text-[length:var(--text-heading)] font-bold text-foreground">Nearby</h1>
        <div className="flex items-center gap-2 text-[length:var(--text-body)] text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span>{listings.length} listings</span>
        </div>
      </div>

      {/* Cards Stack */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="popLayout">
          {listings.slice(0, 3).reverse().map((listing, index) => (
            <SwipeCard
              key={listing.id}
              listing={listing}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onSwipeUp={handleSwipeUp}
              onTap={handleTap}
              isTop={index === listings.slice(0, 3).length - 1}
            />
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {listings.length === 0 && (
          <motion.div 
            className="absolute inset-0 flex flex-col items-center justify-center p-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-[var(--size-avatar)] h-[var(--size-avatar)] rounded-full bg-secondary flex items-center justify-center mb-4">
              <Heart className="w-1/2 h-1/2 text-muted-foreground" />
            </div>
            <h2 className="text-[length:var(--text-price-sm)] font-semibold text-foreground mb-2">All caught up!</h2>
            <p className="text-muted-foreground text-center mb-6">
              No more listings nearby. Check back later for new items.
            </p>
            {discardedListings.length > 0 && (
              <button 
                onClick={handleUndo}
                className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full text-foreground hover:bg-secondary/80 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Undo ({discardedListings.length})
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Action Buttons */}
      {listings.length > 0 && (
        <div className="flex items-center justify-center gap-[var(--space-md)] py-[var(--space-sm)] px-[var(--space-md)]">
          <button 
            onClick={handleSwipeLeft}
            className="w-[var(--size-action-lg)] h-[var(--size-action-lg)] rounded-full bg-secondary flex items-center justify-center hover:bg-destructive/20 hover:border-destructive border-2 border-transparent transition-all"
          >
            <X className="w-[var(--size-icon)] h-[var(--size-icon)] text-destructive" />
          </button>
          
          {discardedListings.length > 0 && (
            <button 
              onClick={handleUndo}
              className="w-[var(--size-action-sm)] h-[var(--size-action-sm)] rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <RotateCcw className="w-[calc(var(--size-icon)*0.85)] h-[calc(var(--size-icon)*0.85)] text-muted-foreground" />
            </button>
          )}
          
          <button 
            onClick={handleSwipeUp}
            className="w-[var(--size-action-md)] h-[var(--size-action-md)] rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowUp className="w-[calc(var(--size-icon)*0.85)] h-[calc(var(--size-icon)*0.85)] text-muted-foreground" />
          </button>
          
          <button 
            onClick={handleSwipeRight}
            className="w-[var(--size-action-lg)] h-[var(--size-action-lg)] rounded-full bg-primary flex items-center justify-center shadow-glow hover:scale-105 transition-transform"
          >
            <Heart className="w-[var(--size-icon)] h-[var(--size-icon)] text-primary-foreground" />
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedListing && (
        <ListingDetail
          listing={selectedListing}
          isOpen={showDetail}
          onClose={() => {
            setShowDetail(false);
            setSelectedListing(null);
          }}
          onMakeOffer={handleMakeOffer}
        />
      )}
    </div>
  );
}
