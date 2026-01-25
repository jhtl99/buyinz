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
          
          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-h-[90vh] overflow-hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-muted rounded-full" />
            </div>
            
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
            
            <div className="overflow-y-auto max-h-[calc(90vh-60px)] hide-scrollbar">
              {/* Image */}
              <div className="relative aspect-square mx-4 rounded-2xl overflow-hidden">
                <img 
                  src={listing.image} 
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <span className="glass px-3 py-1.5 rounded-full text-xs font-medium text-foreground">
                    {listing.condition}
                  </span>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h1 className="text-2xl font-bold text-foreground">{listing.title}</h1>
                    <button className="p-2 rounded-full hover:bg-secondary transition-colors">
                      <Bookmark className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                  <p className="text-3xl font-bold text-primary">${listing.price}</p>
                </div>
                
                {/* Seller Info */}
                <div className="flex items-center gap-4 p-4 bg-secondary rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-lg font-bold text-foreground">
                      {listing.seller.name[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">@{listing.seller.name}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-warning fill-warning" />
                        {listing.seller.rating}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {listing.seller.responseTime}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Meta */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {listing.distance} away
                  </span>
                  <span>Posted {listing.postedAt}</span>
                </div>
                
                {/* Description */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Description</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {listing.description}
                  </p>
                </div>
                
                {/* Offer Section */}
                <div className="p-4 bg-secondary rounded-2xl space-y-4">
                  <h3 className="font-semibold text-foreground">Make an Offer</h3>
                  
                  <div className="flex items-center justify-center gap-6">
                    <button 
                      onClick={() => adjustOffer(-5)}
                      className="w-12 h-12 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                    >
                      <ChevronDown className="w-6 h-6 text-foreground" />
                    </button>
                    
                    <div className="text-center">
                      <span className="text-4xl font-bold text-foreground">${offerAmount}</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round((offerAmount / listing.price) * 100)}% of asking
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => adjustOffer(5)}
                      className="w-12 h-12 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                    >
                      <ChevronUp className="w-6 h-6 text-foreground" />
                    </button>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-3 pb-6">
                  <Button 
                    variant="secondary" 
                    className="flex-1 h-14 rounded-2xl text-base font-semibold"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Message
                  </Button>
                  <Button 
                    onClick={onMakeOffer}
                    className="flex-1 h-14 rounded-2xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Send ${offerAmount}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
