import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ImageAsset } from '@/lib/listings';
import { MAX_PHOTOS } from '@/lib/listings';

interface Props {
  images: ImageAsset[];
  onChange: (images: ImageAsset[]) => void;
}

export function PhotoPicker({ images, onChange }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const remaining = MAX_PHOTOS - images.length;

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newImages: ImageAsset[] = result.assets.map((a) => ({
        uri: a.uri,
        width: a.width,
        height: a.height,
      }));
      onChange([...images, ...newImages].slice(0, MAX_PHOTOS));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Access Required',
        'Allow camera access in Settings to take photos of your items.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      onChange([...images, { uri: asset.uri, width: asset.width, height: asset.height }].slice(0, MAX_PHOTOS));
    }
  };

  const removePhoto = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  if (images.length === 0) {
    return (
      <View style={[styles.emptyContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Ionicons name="camera-outline" size={40} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Add Photos</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Snap or choose up to {MAX_PHOTOS} photos
        </Text>
        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.pickButton, { backgroundColor: colors.tint }]}
            onPress={takePhoto}
          >
            <Ionicons name="camera" size={18} color="#FFF" />
            <Text style={styles.pickButtonText}>Camera</Text>
          </Pressable>
          <Pressable
            style={[styles.pickButton, { backgroundColor: colors.muted }]}
            onPress={pickFromGallery}
          >
            <Ionicons name="images" size={18} color={colors.text} />
            <Text style={[styles.pickButtonText, { color: colors.text }]}>Gallery</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.thumbRow}
      >
        {images.map((img, i) => (
          <View key={img.uri} style={styles.thumbWrapper}>
            <Image source={{ uri: img.uri }} style={styles.thumb} contentFit="cover" />
            {i === 0 && (
              <View style={[styles.mainBadge, { backgroundColor: colors.tint }]}>
                <Text style={styles.mainBadgeText}>Main</Text>
              </View>
            )}
            <Pressable
              style={[styles.removeBtn, { backgroundColor: colors.card }]}
              onPress={() => removePhoto(i)}
              hitSlop={6}
            >
              <Ionicons name="close" size={14} color={colors.text} />
            </Pressable>
          </View>
        ))}

        {remaining > 0 && (
          <Pressable
            style={[styles.addMoreBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={pickFromGallery}
          >
            <Ionicons name="add" size={28} color={colors.textSecondary} />
            <Text style={[styles.addMoreText, { color: colors.textSecondary }]}>
              {remaining} left
            </Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={[styles.buttonRow, { marginTop: 10 }]}>
        <Pressable
          style={[styles.smallPickBtn, { backgroundColor: `${colors.tint}15` }]}
          onPress={takePhoto}
        >
          <Ionicons name="camera" size={16} color={colors.tint} />
          <Text style={[styles.smallPickBtnText, { color: colors.tint }]}>Camera</Text>
        </Pressable>
        <Pressable
          style={[styles.smallPickBtn, { backgroundColor: colors.muted }]}
          onPress={pickFromGallery}
        >
          <Ionicons name="images" size={16} color={colors.textSecondary} />
          <Text style={[styles.smallPickBtnText, { color: colors.textSecondary }]}>Gallery</Text>
        </Pressable>
      </View>
    </View>
  );
}

const THUMB_SIZE = 96;

const styles = StyleSheet.create({
  emptyContainer: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  pickButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  thumbRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  thumbWrapper: {
    position: 'relative',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
  },
  mainBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mainBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  removeBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  addMoreBtn: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addMoreText: {
    fontSize: 11,
    fontWeight: '500',
  },
  smallPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  smallPickBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
