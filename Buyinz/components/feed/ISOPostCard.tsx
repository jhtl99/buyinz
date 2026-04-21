import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import type { ISOPost } from '@/data/mockData';
import { openUserProfile } from '@/lib/openUserProfile';

interface Props {
  post: ISOPost;
}

export function ISOPostCard({ post: initialPost }: Props) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuth();

  const [post, setPost] = useState(initialPost);

  const toggleLike = () => {
    setPost((p) => ({
      ...p,
      liked: !p.liked,
      likes: p.liked ? p.likes - 1 : p.likes + 1,
    }));
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.isoBg,
          borderColor: `${colors.isoBorder}33`,
        },
      ]}
    >
      {/* Seller Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => openUserProfile(router, post.seller.id, user?.id)}
          style={styles.headerSellerPressable}
          hitSlop={4}
        >
          <Image
            source={{ uri: post.seller.avatar }}
            style={[styles.avatar, { borderColor: colors.border, backgroundColor: colors.muted }]}
          />
          <View style={styles.headerText}>
            <Text style={[styles.sellerName, { color: colors.text }]} numberOfLines={1}>
              {post.seller.displayName}
            </Text>
            <Text style={[styles.sellerMeta, { color: colors.textSecondary }]}>
              @{post.seller.username} · {post.createdAt}
            </Text>
          </View>
        </Pressable>
        <View style={[styles.isoBadge, { backgroundColor: colors.tint }]}>
          <Text style={styles.isoBadgeText}>ISO</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Search icon + title */}
        <View style={styles.titleRow}>
          <Ionicons name="search" size={16} color={colors.tint} style={{ marginTop: 2 }} />
          <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>
        </View>

        <Text style={[styles.description, { color: `${colors.text}CC` }]}>
          {post.description}
        </Text>

        {/* Budget + Hashtags */}
        <View style={styles.tagsRow}>
          {post.budget != null && (
            <View
              style={[
                styles.budgetBadge,
                { backgroundColor: `${colors.tint}1A`, borderColor: `${colors.tint}4D` },
              ]}
            >
              <Text style={[styles.budgetText, { color: colors.tint }]}>
                Budget: up to ${post.budget}
              </Text>
            </View>
          )}
          {post.hashtags.map((tag) => (
            <Text key={tag} style={[styles.hashtag, { color: colors.tint }]}>
              {tag}
            </Text>
          ))}
        </View>

        {/* Actions */}
        <View style={[styles.actionsRow, { borderTopColor: `${colors.isoBorder}33` }]}>
          <Pressable
            onPress={toggleLike}
            style={[
              styles.actionBtn,
              post.liked && { backgroundColor: colors.roseBg },
            ]}
          >
            <Ionicons
              name={post.liked ? 'heart' : 'heart-outline'}
              size={16}
              color={post.liked ? colors.rose : colors.textSecondary}
            />
            <Text
              style={[
                styles.actionText,
                { color: post.liked ? colors.rose : colors.textSecondary },
              ]}
            >
              {post.likes}
            </Text>
          </Pressable>

          <Pressable style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>
              {post.comments}
            </Text>
          </Pressable>

          <View style={{ flex: 1 }} />

          <Pressable>
            <Text style={[styles.haveThisText, { color: colors.tint }]}>
              I have this →
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerSellerPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    fontFamily: Fonts.serif,
  },
  sellerMeta: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Fonts.sans,
  },
  isoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  isoBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Fonts.sans,
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    flex: 1,
    fontFamily: Fonts.serif,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
    paddingLeft: 24,
    fontFamily: Fonts.sans,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 24,
    marginBottom: 12,
  },
  budgetBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  budgetText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.sans,
  },
  hashtag: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Fonts.sans,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Fonts.sans,
  },
  haveThisText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.sans,
  },
});
