import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, MapPin, Clock, Bookmark, Send } from 'lucide-react';
import { Listing } from '@/types/listing';
import { useState } from 'react';
import { useMessages } from '@/context/MessagesContext';

const DEFAULT_MESSAGE = 'Hello, I would like to offer...';

interface ListingDetailProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  onMakeOffer: () => void;
}

export function ListingDetail({ listing, isOpen, onClose, onMakeOffer }: ListingDetailProps) {
  const [message, setMessage] = useState('');
  const { startConversation } = useMessages();

  const hasContent = message.trim().length > 0;

  const handleSend = () => {
    const text = hasContent ? message.trim() : DEFAULT_MESSAGE;
    startConversation(listing, text);
    setMessage('');
    onMakeOffer();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-lg bg-card rounded-3xl max-h-[80dvh] overflow-hidden shadow-lg"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex items-center justify-center py-3 px-4 z-10">
                <div className="w-10 h-1 bg-muted rounded-full" />
                <button 
                  onClick={onClose}
                  className="absolute top-2 right-3 p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(80dvh-48px)] hide-scrollbar">
              <div className="flex gap-[var(--space-sm)] mx-[var(--space-sm)] mb-[var(--space-sm)]">
                <div className="relative w-[30vw] max-w-[8rem] aspect-square flex-shrink-0 rounded-2xl overflow-hidden">
                  <img 
                    src={listing.image} 
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 py-1 space-y-1.5">
                  <h1 className="text-[length:var(--text-price-sm)] font-bold text-foreground leading-tight line-clamp-2">{listing.title}</h1>
                  <p className="text-[length:var(--text-price-lg)] font-bold text-primary">${listing.price}</p>
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
              
              <div className="px-[var(--space-md)] pb-[var(--space-md)] space-y-[var(--space-sm)]">
                <div className="grid grid-cols-2 gap-[var(--space-xs)]">
                  <div className="flex items-center gap-2 p-[var(--space-xs)] bg-secondary rounded-xl">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-[length:var(--text-body)] text-foreground truncate">{listing.distance} away</span>
                  </div>
                  <div className="flex items-center gap-2 p-[var(--space-xs)] bg-secondary rounded-xl">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-[length:var(--text-body)] text-foreground truncate">Posted {listing.postedAt}</span>
                  </div>
                </div>

                <div className="flex items-center gap-[var(--space-sm)] p-[var(--space-sm)] bg-secondary rounded-2xl">
                  <div className="w-[var(--size-action-sm)] h-[var(--size-action-sm)] rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-[length:var(--text-body)] font-bold text-foreground">
                      {listing.seller.name[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-[length:var(--text-body)]">@{listing.seller.name}</p>
                    <div className="flex items-center gap-3 text-[calc(var(--text-body)*0.85)] text-muted-foreground">
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
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground text-[length:var(--text-body)]">Description</h3>
                  <p className="text-[length:var(--text-body)] text-muted-foreground leading-relaxed">
                    {listing.description}
                  </p>
                </div>
                
                <div className="p-[var(--space-sm)] bg-secondary rounded-2xl space-y-[var(--space-sm)]">
                  <h3 className="font-semibold text-foreground text-[length:var(--text-body)]">Send a Message</h3>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={DEFAULT_MESSAGE}
                    rows={3}
                    className="w-full bg-muted rounded-xl p-3 text-[length:var(--text-body)] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                  />
                </div>
                
                <div className="flex justify-center pb-[var(--space-md)]">
                  <button
                    onClick={handleSend}
                    className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                      hasContent
                        ? 'bg-primary text-primary-foreground shadow-glow scale-[1.02]'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    Send Message
                  </button>
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
