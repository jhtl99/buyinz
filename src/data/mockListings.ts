import listing1 from '@/assets/listing-1.jpg';
import listing2 from '@/assets/listing-2.jpg';
import listing3 from '@/assets/listing-3.jpg';
import listing4 from '@/assets/listing-4.jpg';
import listing5 from '@/assets/listing-5.jpg';
import listing6 from '@/assets/listing-6.jpg';
import listing7 from '@/assets/listing-7.jpg';
import listing8 from '@/assets/listing-8.jpg';
import listing9 from '@/assets/listing-9.jpg';
import listing10 from '@/assets/listing-10.jpg';


import { Listing, Conversation } from '@/types/listing';

export const mockListings: Listing[] = [
  {
    id: '1',
    title: 'Premium Leather Backpack',
    price: 89,
    image: listing1,
    category: 'Bags',
    distance: '0.4 mi',
    seller: { name: 'alex_m', rating: 4.9, responseTime: '< 1 hr' },
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
    seller: { name: 'vintage_finds', rating: 4.7, responseTime: '< 2 hrs' },
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
    seller: { name: 'photo_pro', rating: 5.0, responseTime: '< 30 min' },
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
    seller: { name: 'sneaker_head', rating: 4.8, responseTime: '< 1 hr' },
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
    seller: { name: 'retro_audio', rating: 4.6, responseTime: '< 1 hr' },
    description: 'Fully functional vintage turntable. Beautiful warm sound. Recently serviced with new belt. Perfect for vinyl enthusiasts.',
    condition: 'Good',
    postedAt: '6 hours ago',
  },
  {
    id: '6',
    title: 'Standing Desk Converter',
    price: 130,
    image: listing6,
    category: 'Furniture',
    distance: '1.5 mi',
    seller: { name: 'home_office', rating: 4.5, responseTime: '< 3 hrs' },
    description: 'Adjustable standing desk riser. Fits on any desk, holds dual monitors. Smooth pneumatic lift. Minor scratches on surface.',
    condition: 'Good',
    postedAt: '4 hours ago',
  },
  {
    id: '7',
    title: 'Wireless Noise-Cancelling Headphones',
    price: 180,
    image: listing7,
    category: 'Electronics',
    distance: '0.3 mi',
    seller: { name: 'audiophile99', rating: 4.9, responseTime: '< 15 min' },
    description: 'Premium over-ear headphones with active noise cancellation. 30-hour battery life. Includes carrying case and cable.',
    condition: 'Like New',
    postedAt: '1 hour ago',
  },
  {
    id: '8',
    title: 'Leather Messenger Bag',
    price: 65,
    image: listing8,
    category: 'Bags',
    distance: '1.8 mi',
    seller: { name: 'bag_lover', rating: 4.4, responseTime: '< 2 hrs' },
    description: 'Distressed leather messenger bag. Fits 13" laptop. Brass buckle closure. Develops a nice patina over time.',
    condition: 'Good',
    postedAt: '8 hours ago',
  },
  {
    id: '9',
    title: 'Running Shoes Size 9',
    price: 55,
    image: listing9,
    category: 'Clothing',
    distance: '0.9 mi',
    seller: { name: 'runner_gal', rating: 4.7, responseTime: '< 1 hr' },
    description: 'Lightweight running shoes, only used for a few months. Great cushioning and support. Bright colorway.',
    condition: 'Good',
    postedAt: '12 hours ago',
  },
  {
    id: '10',
    title: 'Bluetooth Portable Speaker',
    price: 40,
    image: listing10,
    category: 'Electronics',
    distance: '2.5 mi',
    seller: { name: 'music_mike', rating: 4.3, responseTime: '< 4 hrs' },
    description: 'Compact waterproof speaker with surprisingly big sound. 12-hour battery. Perfect for the beach or camping.',
    condition: 'Fair',
    postedAt: '1 day ago',
  },
];

const buyingConversationListingIds = new Set(['1', '3']);

export const feedListings: Listing[] = mockListings.filter(
  l => !buyingConversationListingIds.has(l.id)
);

const myListings: Listing[] = [
  {
    id: 'my-1',
    title: 'Mechanical Keyboard',
    price: 120,
    image: listing3,
    category: 'Electronics',
    distance: '',
    seller: { name: 'me', rating: 5.0, responseTime: '< 10 min' },
    description: 'Cherry MX Blue switches, RGB backlighting, full-size layout. Barely used.',
    condition: 'Like New',
    postedAt: '1 day ago',
  },
  {
    id: 'my-2',
    title: 'Mountain Bike',
    price: 350,
    image: listing4,
    category: 'Sports',
    distance: '',
    seller: { name: 'me', rating: 5.0, responseTime: '< 10 min' },
    description: '21-speed hardtail mountain bike. Recently tuned up with new brakes and tires.',
    condition: 'Good',
    postedAt: '3 days ago',
  },
];

export const mockBuyingConversations: Conversation[] = [
  {
    id: 'buy-1',
    type: 'buying',
    listing: mockListings[0],
    messages: [
      { id: 'm1', senderId: 'me', text: 'Is this still available?', timestamp: '10 min ago' },
    ],
    unread: true,
  },
  {
    id: 'buy-2',
    type: 'buying',
    listing: mockListings[2],
    messages: [
      { id: 'm2', senderId: 'me', text: 'I can do $600 if you can meet today', timestamp: '2 hrs ago' },
    ],
    unread: false,
  },
];

export const mockSellingConversations: Conversation[] = [
  {
    id: 'sell-1',
    type: 'selling',
    listing: myListings[0],
    messages: [
      { id: 's1', senderId: 'buyer_jake', text: 'Hey, would you take $100 for the keyboard?', timestamp: '25 min ago' },
      { id: 's2', senderId: 'me', text: 'I could do $110, it\'s practically brand new', timestamp: '20 min ago' },
      { id: 's3', senderId: 'buyer_jake', text: 'Deal! When can I pick it up?', timestamp: '15 min ago' },
    ],
    unread: true,
  },
  {
    id: 'sell-2',
    type: 'selling',
    listing: myListings[1],
    messages: [
      { id: 's4', senderId: 'trail_rider', text: 'What size frame is the bike?', timestamp: '1 hr ago' },
    ],
    unread: false,
  },
];

export const mockConversations: Conversation[] = [
  ...mockBuyingConversations,
  ...mockSellingConversations,
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
