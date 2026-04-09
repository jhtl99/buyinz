import type { SocialUser } from './socialTypes';

function concatErrorDetails(error: any): string {
  return `${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase();
}

function includesSocialTableMissing(message: string): boolean {
  return (
    message.includes('social_connections') ||
    message.includes('relation') ||
    message.includes('does not exist')
  );
}

export function isMissingSocialTable(error: any): boolean {
  if (!error) return false;
  return includesSocialTableMissing(concatErrorDetails(error));
}

export function mapUserRowToSocialUser(row: any): SocialUser {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    location: row.location,
    bio: row.bio,
    ...(typeof row.buyinz_pro === 'boolean' ? { buyinz_pro: row.buyinz_pro } : {}),
  };
}

/** PostgREST: no rows returned for .maybeSingle() */
export function isNoRowsPostgrestError(error: { code?: string } | null | undefined): boolean {
  return error?.code === 'PGRST116';
}
