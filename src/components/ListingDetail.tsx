import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, MapPin, Clock, MessageCircle, Bookmark, ChevronDown, ChevronUp } from 'lucide-react';
import { Listing } from '@/types/listing';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ListingDetailProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  onMakeOffer: () => void;
}

export function ListingDetail({ listing, isOpen, onClose, onMakeOffer }: ListingDetailProps) {
  const [offerAmount, setOfferAmount] = useState(Math.round(listing.price * 0.9));

  const adjustOffer = (delta: number) => {
    setOfferAmount(prev => Math.max(1, prev + delta));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Centered Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-lg bg-card rounded-3xl max-h-[80vh] overflow-hidden shadow-lg"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top bar: close button */}
              <div className="relative flex items-center justify-center py-3 px-4 z-10">
                <div className="w-10 h-1 bg-muted rounded-full" />
                <button 
                  onClick={onClose}
                  className="absolute top-2 right-3 p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(80vh-48px)] hide-scrollbar">
              {/* Compact image + key info row */}
              <div className="flex gap-4 mx-4 mb-4">
                <div className="relative w-32 h-32 flex-shrink-0 rounded-2xl overflow-hidden">
                  <img 
                    src={listing.image} 
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 py-1 space-y-1.5">
                  <h1 className="text-lg font-bold text-foreground leading-tight line-clamp-2">{listing.title}</h1>
                  <p className="text-2xl font-bold text-primary">${listing.price}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-xs font-medium text-foreground">
                      {listing.condition}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-xs font-medium text-foreground">
                      {listing.category}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="px-6 pb-6 space-y-5">
                {/* Quick details grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 bg-secondary rounded-xl">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground truncate">{listing.distance} away</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-secondary rounded-xl">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground truncate">Posted {listing.postedAt}</span>
                  </div>
                </div>

                {/* Seller Info */}
                <div className="flex items-center gap-4 p-4 bg-secondary rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-foreground">
                      {listing.seller.name[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">@{listing.seller.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                        {listing.seller.rating}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {listing.seller.responseTime}
                      </span>
                    </div>
                  </div>
                  <button className="p-2 rounded-full hover:bg-muted transition-colors flex-shrink-0">
                    <Bookmark className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
                
                {/* Description */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground text-sm">Description</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {listing.description}
                  </p>
                </div>
                
                {/* Offer Section */}
                <div className="p-4 bg-secondary rounded-2xl space-y-4">
                  <h3 className="font-semibold text-foreground text-sm">Make an Offer</h3>
                  
                  <div className="flex items-center justify-center gap-6">
                    <button 
                      onClick={() => adjustOffer(-5)}
                      className="w-11 h-11 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                    >
                      <ChevronDown className="w-5 h-5 text-foreground" />
                    </button>
                    
                    <div className="text-center">
                      <span className="text-3xl font-bold text-foreground">${offerAmount}</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round((offerAmount / listing.price) * 100)}% of asking
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => adjustOffer(5)}
                      className="w-11 h-11 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                    >
                      <ChevronUp className="w-5 h-5 text-foreground" />
                    </button>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-3 pb-6">
                  <Button 
                    variant="secondary" 
                    className="flex-1 h-13 rounded-2xl text-sm font-semibold"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Message
                  </Button>
                  <Button 
                    onClick={onMakeOffer}
                    className="flex-1 h-13 rounded-2xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Send ${offerAmount}
                  </Button>
                </div>
              </div>
            </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
