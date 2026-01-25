export interface Listing {
  id: string;
  title: string;
  price: number;
  image: string;
  category: string;
  distance: string;
  seller: {
    name: string;
    rating: number;
    responseTime: string;
  };
  description: string;
  condition: 'New' | 'Like New' | 'Good' | 'Fair';
  postedAt: string;
}

export interface Conversation {
  id: string;
  listing: Listing;
  lastMessage: string;
  timestamp: string;
  offerStatus: 'pending' | 'accepted' | 'declined' | null;
  offerAmount?: number;
  unread: boolean;
}
