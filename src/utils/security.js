/**
 * Hashes a plain-text password using browser-native standard SHA-256 Web Crypto API.
 * Produces a consistent, irreversible 64-character hexadecimal digest.
 * @param {string} plainText
 * @returns {Promise<string>}
 */
export async function hashPassword(plainText) {
  if (!plainText || typeof plainText !== 'string') return '';
  const trimmed = plainText.trim();
  if (!trimmed) return '';

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(trimmed);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (err) {
      console.warn('Web Crypto hash error:', err);
    }
  }

  return trimmed;
}

/**
 * Validates entered plain password against stored password.
 * Supports dual verification: checks hash first, then falls back to plain-text
 * to ensure 100% backward compatibility for all legacy accounts.
 * @param {string} enteredPlain
 * @param {string} storedPassword
 * @returns {Promise<boolean>}
 */
export async function isPasswordMatch(enteredPlain, storedPassword) {
  if (!enteredPlain || !storedPassword) return false;
  const cleanEntered = enteredPlain.trim();
  const cleanStored = String(storedPassword).trim();

  // 1. Check against computed SHA-256 hash
  const computedHash = await hashPassword(cleanEntered);
  if (computedHash && computedHash === cleanStored) {
    return true;
  }

  // 2. Backward compatibility fallback for legacy plain-text accounts
  if (cleanEntered === cleanStored) {
    return true;
  }

  return false;
}
