/**
 * errors.js — error handling, classification, and user-facing messages.
 *
 * Usage:
 *   import { parseError, isAuthError, ERROR_MESSAGES } from '../utils/errors';
 *
 *   try { await api.login(email, pwd); }
 *   catch (e) {
 *     const msg = parseError(e);
 *     if (isAuthError(e)) redirectToLogin();
 *     toast.error(msg);
 *   }
 */

// ── Error types ───────────────────────────────────────────────────────────────

export const ERROR_TYPES = {
  NETWORK:     'NETWORK',
  AUTH:        'AUTH',
  FORBIDDEN:   'FORBIDDEN',
  NOT_FOUND:   'NOT_FOUND',
  VALIDATION:  'VALIDATION',
  RATE_LIMIT:  'RATE_LIMIT',
  SERVER:      'SERVER',
  UNKNOWN:     'UNKNOWN',
};

// ── Friendly messages ─────────────────────────────────────────────────────────

export const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]:    'Unable to reach the server. Check your connection.',
  [ERROR_TYPES.AUTH]:       'Your session has expired. Please sign in again.',
  [ERROR_TYPES.FORBIDDEN]:  "You don't have permission to perform this action.",
  [ERROR_TYPES.NOT_FOUND]:  'The requested resource no longer exists.',
  [ERROR_TYPES.VALIDATION]: 'Please check your input and try again.',
  [ERROR_TYPES.RATE_LIMIT]: 'Too many requests. Please wait a moment.',
  [ERROR_TYPES.SERVER]:     'A server error occurred. Our team has been notified.',
  [ERROR_TYPES.UNKNOWN]:    'An unexpected error occurred. Please try again.',
};

// ── Classify error by HTTP status ─────────────────────────────────────────────

export function classifyError(error) {
  // Network failure (no response)
  if (!error || error.name === 'TypeError' || error.name === 'NetworkError') {
    return ERROR_TYPES.NETWORK;
  }

  // HTTP status codes
  const status = error.status || error.statusCode || extractStatus(error.message);
  if (status) {
    if (status === 401) return ERROR_TYPES.AUTH;
    if (status === 403) return ERROR_TYPES.FORBIDDEN;
    if (status === 404) return ERROR_TYPES.NOT_FOUND;
    if (status === 422) return ERROR_TYPES.VALIDATION;
    if (status === 429) return ERROR_TYPES.RATE_LIMIT;
    if (status >= 500)  return ERROR_TYPES.SERVER;
  }

  return ERROR_TYPES.UNKNOWN;
}

function extractStatus(message = '') {
  const match = message.match(/\b([45]\d{2})\b/);
  return match ? parseInt(match[1], 10) : null;
}

// ── Parse error to user-readable string ──────────────────────────────────────

/**
 * Extract the best user-facing message from any error shape.
 *
 * FastAPI errors have:  { detail: "string" }  or  { detail: [{msg, loc}] }
 * Generic JS errors have: error.message
 */
export function parseError(error) {
  if (!error) return ERROR_MESSAGES[ERROR_TYPES.UNKNOWN];

  // FastAPI validation errors — array of {msg, loc}
  if (error.detail && Array.isArray(error.detail)) {
    return error.detail.map((e) => e.msg).join('; ');
  }

  // FastAPI string detail
  if (typeof error.detail === 'string') return error.detail;

  // Nested response body
  if (error.body?.detail) return error.body.detail;

  // Plain JS error message
  if (error.message) {
    // Strip status codes from message if present
    return error.message.replace(/^\d{3}:\s*/, '');
  }

  // Fallback by type
  return ERROR_MESSAGES[classifyError(error)];
}

// ── Type guards ───────────────────────────────────────────────────────────────

export const isAuthError      = (e) => classifyError(e) === ERROR_TYPES.AUTH;
export const isForbiddenError = (e) => classifyError(e) === ERROR_TYPES.FORBIDDEN;
export const isNotFoundError  = (e) => classifyError(e) === ERROR_TYPES.NOT_FOUND;
export const isNetworkError   = (e) => classifyError(e) === ERROR_TYPES.NETWORK;
export const isValidationError= (e) => classifyError(e) === ERROR_TYPES.VALIDATION;
export const isServerError    = (e) => classifyError(e) === ERROR_TYPES.SERVER;

// ── ForgeError — typed error class ───────────────────────────────────────────

export class ForgeError extends Error {
  constructor(message, type = ERROR_TYPES.UNKNOWN, status = null) {
    super(message);
    this.name = 'ForgeError';
    this.type = type;
    this.status = status;
  }

  get userMessage() {
    return ERROR_MESSAGES[this.type] || this.message;
  }

  static fromResponse(status, body) {
    const type  = classifyError({ status });
    const msg   = parseError(body) || ERROR_MESSAGES[type];
    return new ForgeError(msg, type, status);
  }
}

// ── withErrorBoundary — async try/catch wrapper ───────────────────────────────

/**
 * Wraps an async call, returns [data, error] tuple.
 * Useful in event handlers where you can't use async/await throws.
 *
 * @example
 *   const [user, err] = await tryCatch(() => authApi.login(email, pwd));
 *   if (err) toast.error(parseError(err));
 */
export async function tryCatch(fn) {
  try {
    return [await fn(), null];
  } catch (error) {
    return [null, error];
  }
}

// ── Error logging ─────────────────────────────────────────────────────────────

const _logged = new WeakSet();

/**
 * Log an error (deduplicated). In production, send to your error tracker.
 */
export function logError(error, context = {}) {
  if (error && _logged.has(error)) return;
  if (error) _logged.add(error);

  const type   = classifyError(error);
  const msg    = parseError(error);

  // Skip logging auth redirects — expected
  if (type === ERROR_TYPES.AUTH) return;

  if (import.meta.env.DEV) {
    console.error('[Forge Error]', { type, msg, context, error });
  } else {
    // In production: send to Sentry / Datadog
    // Sentry.captureException(error, { extra: context });
    console.error('[Forge Error]', type, msg);
  }
}
