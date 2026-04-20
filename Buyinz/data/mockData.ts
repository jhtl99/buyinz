export interface Seller {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  location: string;
  bio: string;
  followers: number;
  following: number;
  posts: number;
  accountType: 'user' | 'store';
  latitude: number | null;
  longitude: number | null;
}

export interface SalePost {
  id: string;
  type: "sale";
  seller: Seller;
  images: string[];
  title: string;
  /** null = no price set */
  price: number | null;
  category: string;
  description: string;
  likes: number;
  comments: number;
  liked: boolean;
  createdAt: string;
  hashtags: string[];
  sold: boolean;
}

export interface ISOPost {
  id: string;
  type: "iso";
  seller: Seller;
  title: string;
  description: string;
  budget?: number;
  category: string;
  likes: number;
  comments: number;
  liked: boolean;
  createdAt: string;
  hashtags: string[];
}

export type Post = SalePost | ISOPost;

export const MOCK_SELLERS: Seller[] = [
  {
    id: "u1",
    username: "steelcity_thrift",
    displayName: "Steel City Thrift",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=steelcity",
    location: "Lawrenceville, Pittsburgh PA",
    bio: "Local thrifter & vintage hunter 🏈 Steelers forever",
    followers: 1240,
    following: 380,
    posts: 9,
    accountType: "store",
    latitude: 40.4741,
    longitude: -79.9563,
  },
  {
    id: "u2",
    username: "pgh_moving_sale",
    displayName: "Moving Sale — Sarah",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah123",
    location: "Squirrel Hill, Pittsburgh PA",
    bio: "Moving to NYC next month — everything must go! 📦",
    followers: 214,
    following: 102,
    posts: 14,
    accountType: "user",
    latitude: null,
    longitude: null,
  },
  {
    id: "u3",
    username: "mcm_mike_pgh",
    displayName: "MCM Mike",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mcmmike",
    location: "Point Breeze, Pittsburgh PA",
    bio: "Mid-century modern collector. Furniture is furniture, unless it's Eames.",
    followers: 3100,
    following: 220,
    posts: 41,
    accountType: "user",
    latitude: null,
    longitude: null,
  },
  {
    id: "u4",
    username: "riverfront_reads",
    displayName: "Riverfront Reads",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=riverreads",
    location: "Strip District, Pittsburgh PA",
    bio: "Books, records, and curiosities from the Mon Valley",
    followers: 890,
    following: 450,
    posts: 22,
    accountType: "store",
    latitude: 40.4508,
    longitude: -79.9913,
  },
  {
    id: "u5",
    username: "northside_nicole",
    displayName: "Nicole B.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=nicole_pgh",
    location: "North Side, Pittsburgh PA",
    bio: "Closet cleanout queen. If I haven't worn it in 6 months... 👋",
    followers: 560,
    following: 310,
    posts: 18,
    accountType: "user",
    latitude: null,
    longitude: null,
  },
];

export const MOCK_FEED_POSTS: Post[] = [
  {
    id: "p1",
    type: "sale",
    seller: MOCK_SELLERS[0],
    images: [
      "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&q=80",
      "https://images.unsplash.com/photo-1520367445093-50dc08a59d9d?w=600&q=80",
    ],
    title: "Vintage Pittsburgh Steelers Jersey — #58 Lambert",
    price: 85,
    category: "Clothing",
    description: "Classic Steelers jersey from the late 80s. Some fading adds to the charm. Size XL.",
    likes: 47,
    comments: 12,
    liked: false,
    createdAt: "2h ago",
    hashtags: ["#VintageSteelers", "#ThriftFinds", "#Pittsburgh"],
    sold: false,
  },
  {
    id: "p2",
    type: "iso",
    seller: MOCK_SELLERS[1],
    title: "ISO: Dining table + 4 chairs",
    description:
      "Looking for a solid wood dining set for my new apartment. Doesn't need to be perfect — I can refinish it. Something like farmhouse or Shaker style preferred.",
    budget: 200,
    category: "Furniture",
    likes: 8,
    comments: 3,
    liked: false,
    createdAt: "3h ago",
    hashtags: ["#PittMovingSale", "#ISO"],
  },
  {
    id: "p3",
    type: "sale",
    seller: MOCK_SELLERS[2],
    images: [
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80",
      "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&q=80",
    ],
    title: "Eames-Era Lounge Chair — Walnut Shell",
    price: 340,
    category: "Furniture",
    description:
      "Beautiful mid-century lounge chair. Walnut veneer shell, original cushions recently re-upholstered in cream boucle. Absolutely stunning piece.",
    likes: 134,
    comments: 28,
    liked: true,
    createdAt: "5h ago",
    hashtags: ["#MCM", "#MidCenturyModern", "#Pittsburgh"],
    sold: false,
  },
  {
    id: "p4",
    type: "sale",
    seller: MOCK_SELLERS[4],
    images: [
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&q=80",
    ],
    title: "Bundle of 6 Vintage Band Tees — Mostly M",
    price: 55,
    category: "Clothing",
    description:
      "Cleaning out the closet! Mix of Zeppelin, Talking Heads, and a couple local Pittsburgh bands. All authentic, worn once or twice.",
    likes: 62,
    comments: 9,
    liked: false,
    createdAt: "7h ago",
    hashtags: ["#ThriftFinds", "#VintageClothing", "#NorthSidePgh"],
    sold: false,
  },
  {
    id: "p5",
    type: "iso",
    seller: MOCK_SELLERS[3],
    title: "ISO: Vintage record player or turntable",
    description:
      "Looking for a working turntable — Technics, Pioneer, or similar. Belt-drive preferred. Budget is flexible for the right piece. North Side / Strip District pickup preferred.",
    budget: 150,
    category: "Electronics",
    likes: 22,
    comments: 7,
    liked: false,
    createdAt: "10h ago",
    hashtags: ["#ISO", "#Vinyl", "#Pittsburgh"],
  },
  {
    id: "p6",
    type: "sale",
    seller: MOCK_SELLERS[1],
    images: [
      "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80",
    ],
    title: "Full Moving Sale — Furniture, Kitchen, Decor",
    price: 0,
    category: "Other",
    description:
      "MOVING SALE! Entire apartment worth of stuff. Couch, coffee table, kitchenware, art, lamps, and more. DM for full list. Squirrel Hill pickup only. Everything negotiable.",
    likes: 191,
    comments: 44,
    liked: false,
    createdAt: "1d ago",
    hashtags: ["#PittMovingSale", "#SquirrelHill", "#MovingSale"],
    sold: false,
  },
  {
    id: "p7",
    type: "sale",
    seller: MOCK_SELLERS[2],
    images: [
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80",
    ],
    title: "Tulip Side Table — Saarinen Reproduction",
    price: 120,
    category: "Furniture",
    description:
      "Beautiful Saarinen-style tulip side table in white. Perfect condition, used only as a display piece. Pairs incredibly with any MCM room.",
    likes: 78,
    comments: 11,
    liked: false,
    createdAt: "1d ago",
    hashtags: ["#MCM", "#Saarinen", "#ThriftFinds"],
    sold: false,
  },
  {
    id: "p8",
    type: "sale",
    seller: MOCK_SELLERS[3],
    images: [
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80",
      "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&q=80",
    ],
    title: "Box of 40+ Vintage Paperbacks",
    price: 30,
    category: "Books",
    description:
      "Eclectic mix — sci-fi, detective novels, some Penguin classics, a few Steelers biographies. All readable condition. Great for a bookshelf display.",
    likes: 35,
    comments: 6,
    liked: false,
    createdAt: "2d ago",
    hashtags: ["#Books", "#ThriftFinds", "#StripDistrict"],
    sold: false,
  },
  {
    id: "p9",
    type: "iso",
    seller: MOCK_SELLERS[4],
    title: "ISO: Vintage vanity mirror with lights",
    description:
      "You know the ones — Hollywood-style bulb mirror. Preferably working. Gold or chrome frame. Willing to pay up to my budget for the right piece.",
    budget: 80,
    category: "Decor",
    likes: 14,
    comments: 2,
    liked: false,
    createdAt: "2d ago",
    hashtags: ["#ISO", "#Decor", "#Vintage"],
  },
];
