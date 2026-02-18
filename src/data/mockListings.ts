import listing1 from '@/assets/listing-1.jpg';
import listing2 from '@/assets/listing-2.jpg';
import listing3 from '@/assets/listing-3.jpg';
import listing4 from '@/assets/listing-4.jpg';
import listing5 from '@/assets/listing-5.jpg';
import { Listing, Conversation } from '@/types/listing';

export const mockListings: Listing[] = [
  {
    id: '1',
    title: 'Premium Leather Backpack',
    price: 89,
    image: listing1,
    category: 'Bags',
    distance: '0.4 mi',
    seller: {
      name: 'alex_m',
      rating: 4.9,
      responseTime: '< 1 hr',
    },
    description: 'Genuine leather backpack in excellent condition. Barely used, perfect for work or travel. Has laptop sleeve and multiple compartments.',
    condition: 'Like New',
    postedAt: '2 hours ago',
  },
  {
    id: '2',
    title: 'Mid-Century Modern Chair',
    price: 175,
    image: listing2,
    category: 'Furniture',
    distance: '1.2 mi',
    seller: {
      name: 'vintage_finds',
      rating: 4.7,
      responseTime: '< 2 hrs',
    },
    description: 'Beautiful vintage wooden chair. Great condition with minor wear consistent with age. Perfect for dining room or office.',
    condition: 'Good',
    postedAt: '5 hours ago',
  },
  {
    id: '3',
    title: 'Professional DSLR Camera',
    price: 650,
    image: listing3,
    category: 'Electronics',
    distance: '0.8 mi',
    seller: {
      name: 'photo_pro',
      rating: 5.0,
      responseTime: '< 30 min',
    },
    description: 'Full-frame DSLR with 24-70mm lens. Shutter count under 10k. Includes original box, battery, charger, and camera bag.',
    condition: 'Like New',
    postedAt: '1 day ago',
  },
  {
    id: '4',
    title: 'White Sneakers Size 10',
    price: 95,
    image: listing4,
    category: 'Clothing',
    distance: '2.1 mi',
    seller: {
      name: 'sneaker_head',
      rating: 4.8,
      responseTime: '< 1 hr',
    },
    description: 'Classic white sneakers in size 10. Worn only a handful of times. No scuffs or stains. Comes with original box.',
    condition: 'Like New',
    postedAt: '3 hours ago',
  },
  {
    id: '5',
    title: 'Vintage Record Player',
    price: 220,
    image: listing5,
    category: 'Electronics',
    distance: '0.6 mi',
    seller: {
      name: 'retro_audio',
      rating: 4.6,
      responseTime: '< 1 hr',
    },
    description: 'Fully functional vintage turntable. Beautiful warm sound. Recently serviced with new belt. Perfect for vinyl enthusiasts.',
    condition: 'Good',
    postedAt: '6 hours ago',
  },
];

export const mockConversations: Conversation[] = [
  {
    id: '1',
    listing: mockListings[0],
    messages: [
      { id: 'm1', senderId: 'me', text: 'Is this still available?', timestamp: '10 min ago' },
    ],
    unread: true,
  },
  {
    id: '2',
    listing: mockListings[2],
    messages: [
      { id: 'm2', senderId: 'me', text: 'I can do $600 if you can meet today', timestamp: '2 hrs ago' },
    ],
    unread: false,
  },
];

export const categories = [
  'All',
  'Clothing',
  'Electronics',
  'Furniture',
  'Bags',
  'Cars',
  'Home',
  'Sports',
];
