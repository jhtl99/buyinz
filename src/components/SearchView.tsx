import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon, SlidersHorizontal, MapPin } from 'lucide-react';
import { categories, mockListings } from '@/data/mockListings';
import { Listing } from '@/types/listing';
import { ListingDetail } from './ListingDetail';
import { toast } from 'sonner';

export function SearchView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const filteredListings = mockListings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || listing.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-secondary rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            />
          </div>
          <button className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center hover:bg-secondary/80 transition-colors">
            <SlidersHorizontal className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Category Chips */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Results Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        <p className="text-sm text-muted-foreground mb-4">
          {filteredListings.length} results
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          {filteredListings.map((listing, index) => (
            <motion.button
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedListing(listing)}
              className="text-left"
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-card mb-2">
                <img 
                  src={listing.image} 
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2">
                  <span className="glass px-2 py-1 rounded-lg text-xs font-medium text-foreground">
                    ${listing.price}
                  </span>
                </div>
              </div>
              <h3 className="text-sm font-medium text-foreground line-clamp-1">
                {listing.title}
              </h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{listing.distance}</span>
              </div>
            </motion.button>
          ))}
        </div>

        {filteredListings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <SearchIcon className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No items found</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedListing && (
        <ListingDetail
          listing={selectedListing}
          isOpen={!!selectedListing}
          onClose={() => setSelectedListing(null)}
          onMakeOffer={() => {
            setSelectedListing(null);
            toast.success('Offer sent!');
          }}
        />
      )}
    </div>
  );
}
