/**
 * validators.js — form field validation for Forge.
 *
 * Each validator returns null (valid) or an error string.
 * Compose multiple validators with validate().
 *
 * Usage:
 *   const err = validate(email, [required(), emailFormat()]);
 *   const err = validate(pwd,   [required(), minLength(8), hasUppercase(), hasSpecial()]);
 */

// ── Primitives ────────────────────────────────────────────────────────────────

export const required = (msg = 'This field is required') =>
  (value) => (!value && value !== 0 ? msg : null);

export const minLength = (n, msg) =>
  (value) => (value && value.length < n ? (msg ?? `Minimum ${n} characters`) : null);

export const maxLength = (n, msg) =>
  (value) => (value && value.length > n ? (msg ?? `Maximum ${n} characters`) : null);

export const exactLength = (n, msg) =>
  (value) => (value && value.length !== n ? (msg ?? `Must be exactly ${n} characters`) : null);

export const pattern = (regex, msg = 'Invalid format') =>
  (value) => (value && !regex.test(value) ? msg : null);

// ── String ────────────────────────────────────────────────────────────────────

export const emailFormat = (msg = 'Must be a valid email address') =>
  pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, msg);

export const urlFormat = (msg = 'Must be a valid URL') =>
  (value) => {
    if (!value) return null;
    try { new URL(value); return null; } catch { return msg; }
  };

export const slugFormat = (msg = 'Only lowercase letters, numbers, and hyphens') =>
  pattern(/^[a-z0-9-]+$/, msg);

export const noSpaces = (msg = 'Must not contain spaces') =>
  pattern(/^\S+$/, msg);

export const alphanumeric = (msg = 'Only letters and numbers allowed') =>
  pattern(/^[a-zA-Z0-9]+$/, msg);

// ── Numbers ───────────────────────────────────────────────────────────────────

export const isNumber = (msg = 'Must be a number') =>
  (value) => (value !== '' && value !== null && Number.isNaN(Number(value)) ? msg : null);

export const min = (n, msg) =>
  (value) => (value !== '' && Number(value) < n ? (msg ?? `Minimum value is ${n}`) : null);

export const max = (n, msg) =>
  (value) => (value !== '' && Number(value) > n ? (msg ?? `Maximum value is ${n}`) : null);

// ── Password ──────────────────────────────────────────────────────────────────

export const hasUppercase = (msg = 'Must contain at least one uppercase letter') =>
  (value) => (value && !/[A-Z]/.test(value) ? msg : null);

export const hasLowercase = (msg = 'Must contain at least one lowercase letter') =>
  (value) => (value && !/[a-z]/.test(value) ? msg : null);

export const hasDigit = (msg = 'Must contain at least one number') =>
  (value) => (value && !/\d/.test(value) ? msg : null);

export const hasSpecial = (msg = 'Must contain at least one special character') =>
  (value) => (value && !/[!@#$%^&*()_+\-=[\]{}|;':",.<>?/`~\\]/.test(value) ? msg : null);

export const passwordStrength = [
  required(),
  minLength(8),
  hasUppercase(),
  hasDigit(),
  hasSpecial(),
];

export const passwordMatch = (other, msg = 'Passwords do not match') =>
  (value) => (value !== other ? msg : null);

// ── Compose ───────────────────────────────────────────────────────────────────

/**
 * Run multiple validators against a value, returning the first error or null.
 *
 * @param {*} value
 * @param {Array<Function>} validators
 * @returns {string|null}
 */
export function validate(value, validators = []) {
  for (const validator of validators) {
    const error = validator(value);
    if (error) return error;
  }
  return null;
}

/**
 * Validate an entire form object at once.
 *
 * @param {object} values         — { fieldName: value }
 * @param {object} schema         — { fieldName: [validators…] }
 * @returns {{ errors, valid }}
 *
 * @example
 *   const { errors, valid } = validateForm(
 *     { email, password },
 *     { email: [required(), emailFormat()], password: passwordStrength }
 *   );
 */
export function validateForm(values, schema) {
  const errors = {};
  let valid = true;

  for (const [field, validators] of Object.entries(schema)) {
    const error = validate(values[field], validators);
    if (error) {
      errors[field] = error;
      valid = false;
    }
  }

  return { errors, valid };
}

// ── Domain-specific ───────────────────────────────────────────────────────────

export const workspaceName = [required(), minLength(1), maxLength(80)];
export const projectName   = [required(), minLength(1), maxLength(120)];
export const email         = [required(), emailFormat()];
export const newPassword   = [...passwordStrength, maxLength(128)];
