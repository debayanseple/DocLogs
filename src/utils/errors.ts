/**
 * Convert raw backend/auth error messages into short,
 * customer-understandable sentences. Never leaks table names,
 * status codes, SQL, or vendor wording to the UI.
 */
export function friendlyAuthError(raw: unknown): string {
  const msg = (
    typeof raw === 'string' ? raw : (raw as { message?: unknown })?.message ?? ''
  )
    .toString()
    .toLowerCase();

  if (!msg) return 'Something went wrong. Please try again.';
  if (msg.includes('invalid login credentials') || msg.includes('invalid email or password'))
    return 'Email or password is incorrect. Please try again.';
  if (msg.includes('email not confirmed') || msg.includes('email not verified') || msg.includes('confirm'))
    return 'Please verify your email first, then sign in.';
  if (msg.includes('user already registered') || msg.includes('already exists') || msg.includes('duplicate'))
    return 'An account with this email already exists. Please sign in instead.';
  if (msg.includes('password') && (msg.includes('short') || msg.includes('6 characters') || msg.includes('weak')))
    return 'Password must be at least 6 characters.';
  if (msg.includes('invalid email') || msg.includes('email address'))
    return 'Please enter a valid email address.';
  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('failed to fetch') ||
    msg.includes('connection') ||
    msg.includes('timeout') ||
    msg.includes('unavailable')
  )
    return 'Could not connect. Please check your internet and try again.';
  if (msg.includes('too many') || msg.includes('rate limit') || msg.includes('throttle'))
    return 'Too many attempts. Please wait a moment and try again.';
  return 'Something went wrong. Please try again.';
}

/** Friendly message for save/update failures (assistant, facilities, …). */
export function friendlySaveError(raw: unknown, what = 'changes'): string {
  const msg = (
    typeof raw === 'string' ? raw : (raw as { message?: unknown })?.message ?? ''
  )
    .toString()
    .toLowerCase();

  if (!msg) return `Could not save ${what}. Please try again.`;
  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('failed to fetch') ||
    msg.includes('connection') ||
    msg.includes('timeout') ||
    msg.includes('unavailable')
  )
    return 'Could not connect. Please check your internet and try again.';
  if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('already exists'))
    return 'This entry already exists. Please check and try again.';
  if (
    msg.includes('permission') ||
    msg.includes('policy') ||
    msg.includes('not allowed') ||
    msg.includes('unauthorized') ||
    msg.includes('rls')
  )
    return "You don't have permission for this action.";
  return `Could not save ${what}. Please try again.`;
}
