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

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  type: 'buying' | 'selling';
  listing: Listing;
  messages: Message[];
  unread: boolean;
}
