import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Brand, ConditionColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { OfferModal } from '@/components/offers/OfferModal';
import { submitOffer } from '@/lib/offers';
import { supabase } from '@/supabase/client';
// For demo purposes, we will fetch directly or use mock if not found, 
// normally we'd pass a query, but since we have a mock system:
import { MOCK_FEED_POSTS, SalePost } from '@/data/mockData';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuth();

  const [post, setPost] = useState<SalePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [offerModalVisible, setOfferModalVisible] = useState(false);

  useEffect(() => {
    // 1. In a real app we would fetch the single item based on `id`
    // Just pulling from mock feed for immediate prototyping:
    const found = MOCK_FEED_POSTS.find(p => p.id === id && p.type === 'sale') as SalePost;
    
    // As backup if it's from DB
    if (!found) {
      const fetchFromDb = async () => {
         const { data, error } = await supabase.from('posts').select('*, users(*)').eq('id', id).single();
         if (data) {
             setPost({
               id: data.id,
               type: 'sale',
               seller: {
                 id: data.users.id,
                 username: data.users.username,
                 displayName: data.users.display_name,
                 avatar: data.users.avatar_url || '',
                 location: data.users.location || '',
                 bio: data.users.bio || '',
                 followers: 0, following: 0, posts: 0
               },
               images: data.images || [],
               title: data.title,
               price: data.price || 0,
               condition: data.condition || 'Good',
               category: data.category,
               description: data.description || '',
               likes: 0, comments: 0, liked: false, createdAt: 'Just now', hashtags: data.hashtags || []
             } as SalePost);
         }
         setLoading(false);
      };
      fetchFromDb();
      return;
    }

    setPost(found);
    setLoading(false);
  }, [id]);

  const handleMakeOffer = async (amount: number) => {
    if (!user) {
      Alert.alert('Not Signed In', 'Please sign in to make an offer.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/create-profile') } // Adjust route to your login screen
      ]);
      throw new Error('Not Signed In');
    }
    
    if (!post) return;

    const res = await submitOffer(
      post.id,
      user.id,
      post.seller.id,
      amount,
      post.price
    );

    if (!res.success) {
      throw new Error(res.error);
    }
    
    Alert.alert('Offer Sent!', `You offered $${amount}. The seller will be notified.`);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
         <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    );
  }

  if (!post) {
      return (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
            <Text style={{ color: colors.text }}>Listing not found</Text>
        </View>
      );
  }

  const condColors = ConditionColors[post.condition];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        {/* Images */}
        <ScrollView horizontal pagingEnabled style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}>
          {post.images.length > 0 ? post.images.map((uri, i) => (
             <Image key={i} source={{ uri }} style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }} contentFit="cover" />
          )) : (
             <View style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center'}}>
                 <Ionicons name="image-outline" size={48} color={colors.textSecondary} />
             </View>
          )}
        </ScrollView>

        <View style={styles.content}>
           {/* Price and Title */}
           <View style={styles.titleRow}>
             <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>
             <Text style={[styles.price, { color: Brand.primary }]}>${post.price}</Text>
           </View>
           
           <View style={[styles.conditionBadge, { backgroundColor: condColors.bg, borderColor: condColors.border, alignSelf: 'flex-start' }]}>
              <Text style={[styles.conditionText, { color: condColors.text }]}>{post.condition}</Text>
           </View>

           {/* Seller */}
           <View style={[styles.sellerRow, { borderBottomColor: colors.border, borderTopColor: colors.border }]}>
             <Image source={{ uri: post.seller.avatar }} style={[styles.avatar, { borderColor: colors.border }]} />
             <View style={styles.sellerInfo}>
                <Text style={[styles.sellerName, { color: colors.text }]}>{post.seller.displayName}</Text>
                <Text style={[styles.sellerMeta, { color: colors.textSecondary }]}>@{post.seller.username}</Text>
             </View>
           </View>

           {/* Details */}
           <Text style={[styles.description, { color: colors.text }]}>{post.description}</Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
         <Pressable 
            style={[styles.bottomButton, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => Alert.alert('Message', 'Messaging UI coming soon.')}
         >
             <Ionicons name="chatbubble-outline" size={20} color={colors.text} />
             <Text style={[styles.buttonText, { color: colors.text }]}>Message</Text>
         </Pressable>
         
         {/* Cannot make offer on your own item */}
         {user?.id !== post.seller.id && (
             <Pressable 
                style={[styles.bottomButton, { backgroundColor: Brand.primary }]}
                onPress={() => setOfferModalVisible(true)}
             >
                 <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Make Offer</Text>
             </Pressable>
         )}
      </View>

      <OfferModal 
        visible={offerModalVisible} 
        onClose={() => setOfferModalVisible(false)} 
        onSubmit={handleMakeOffer}
        originalPrice={post.price}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100, // Make room for bottom bar
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    marginRight: 16,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  sellerMeta: {
    fontSize: 14,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32, // Safe area padding can be added
    borderTopWidth: 1,
    gap: 12,
  },
  bottomButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  }
});
