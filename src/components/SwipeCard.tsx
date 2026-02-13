import { useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { MapPin, Star, X, ArrowUp, Heart } from 'lucide-react';
import { Listing } from '@/types/listing';

interface SwipeCardProps {
  listing: Listing;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
  onTap: () => void;
  isTop: boolean;
}

export function SwipeCard({ listing, onSwipeLeft, onSwipeRight, onSwipeUp, onTap, isTop }: SwipeCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const hasDragged = useRef(false);
  
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
  
  const leftIndicatorOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const rightIndicatorOpacity = useTransform(x, [0, 50, 100], [0, 0.5, 1]);
  const upIndicatorOpacity = useTransform(y, [-100, -50, 0], [1, 0.5, 0]);

  const handleDragStart = () => {
    hasDragged.current = true;
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    const velocityThreshold = 500;
    
    if (info.offset.y < -threshold || info.velocity.y < -velocityThreshold) {
      onSwipeUp();
    } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
      onSwipeLeft();
    } else if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      onSwipeRight();
    }
  };

  const handleClick = () => {
    if (!isTop) return;
    if (hasDragged.current) {
      hasDragged.current = false;
      return;
    }
    onTap();
  };

  return (
    <motion.div
      className={`absolute inset-[var(--space-sm)] ${isTop ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
      style={{ x, y, rotate, opacity }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.98 }}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ 
        x: x.get() > 0 ? 300 : x.get() < 0 ? -300 : 0,
        y: y.get() < -50 ? -300 : 0,
        opacity: 0,
        transition: { duration: 0.3 }
      }}
      onClick={handleClick}
    >
      {/* Card */}
      <div className="relative h-full rounded-3xl overflow-hidden bg-card shadow-lg">
        {/* Image */}
        <img 
          src={listing.image} 
          alt={listing.title}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        
        {/* Gradient overlay */}
        <div 
          className="absolute inset-0"
          style={{ background: 'var(--overlay-gradient)' }}
        />
        
        {/* Swipe Indicators */}
        <motion.div 
          className="absolute top-[var(--space-lg)] left-[var(--space-lg)] bg-destructive text-destructive-foreground px-[var(--space-sm)] py-[var(--space-xs)] rounded-xl font-bold"
          style={{ opacity: leftIndicatorOpacity }}
        >
          <X className="w-[var(--size-icon)] h-[var(--size-icon)]" />
        </motion.div>
        
        <motion.div 
          className="absolute top-[var(--space-lg)] right-[var(--space-lg)] bg-primary text-primary-foreground px-[var(--space-sm)] py-[var(--space-xs)] rounded-xl font-bold"
          style={{ opacity: rightIndicatorOpacity }}
        >
          <Heart className="w-[var(--size-icon)] h-[var(--size-icon)]" />
        </motion.div>
        
        <motion.div 
          className="absolute top-[var(--space-lg)] left-1/2 -translate-x-1/2 bg-muted text-muted-foreground px-[var(--space-sm)] py-[var(--space-xs)] rounded-xl font-bold"
          style={{ opacity: upIndicatorOpacity }}
        >
          <ArrowUp className="w-[var(--size-icon)] h-[var(--size-icon)]" />
        </motion.div>
        
        {/* Category Badge */}
        <div className="absolute top-[var(--space-md)] left-[var(--space-md)]">
          <span className="glass px-[var(--space-xs)] py-1 rounded-full text-[length:var(--text-body)] font-medium text-foreground">
            {listing.category}
          </span>
        </div>
        
        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-[var(--space-md)]">
          <div className="space-y-[var(--space-xs)]">
            {/* Price */}
            <div className="flex items-baseline gap-1">
              <span className="text-[length:var(--text-price-lg)] font-bold text-foreground">${listing.price}</span>
            </div>
            
            {/* Title */}
            <h2 className="text-[length:var(--text-price-sm)] font-semibold text-foreground leading-tight">
              {listing.title}
            </h2>
            
            {/* Meta */}
            <div className="flex items-center gap-[var(--space-sm)] text-[length:var(--text-body)] text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{listing.distance}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-warning fill-warning" />
                <span>{listing.seller.rating}</span>
              </div>
              <span>@{listing.seller.name}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
