// profiles.email is not readable by client roles. Always select explicit
// public columns instead of `profiles(*)`.
export const PUBLIC_PROFILE_COLUMNS =
  'id, display_name, avatar_url, verification_status, created_at, transaction_count';
