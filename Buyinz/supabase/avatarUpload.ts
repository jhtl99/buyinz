import { supabase } from './client';
import { contentTypeForImageExtension, extensionFromUri } from './postsInsert';

export const AVATAR_BUCKET = 'avatars';

/**
 * Upload a gallery/camera image to public Storage and return its public URL.
 * Path is scoped to the user so RLS allows the write.
 */
export async function uploadLocalImageToAvatarBucket(
  localUri: string,
  userId: string,
): Promise<string> {
  const ext = extensionFromUri(localUri);
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const contentType = contentTypeForImageExtension(ext);
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, arrayBuffer, { contentType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

const HTTP_URL = /^https?:\/\//i;

/** Persist remote URLs as-is; upload local picks so other devices can load the image. */
export async function resolveAvatarUrlForProfileSave(
  uri: string,
  userId: string,
): Promise<string> {
  const trimmed = uri.trim();
  if (trimmed.length === 0) return trimmed;
  if (HTTP_URL.test(trimmed)) return trimmed;
  return uploadLocalImageToAvatarBucket(trimmed, userId);
}
