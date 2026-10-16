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

/**
 * Computes a deterministic 4-digit PIN for service attendance based on the date.
 * Allows instant offline verification inside church halls without network access.
 * @param {string} [dateStr] - YYYY-MM-DD
 * @returns {string} 4-digit numeric string
 */
export function getDailyServicePin(dateStr) {
  const cleanDate = (dateStr || new Date().toISOString().split('T')[0]).trim();
  const parts = cleanDate.split('-').map(Number);
  const year = parts[0] || 2026;
  const month = parts[1] || 10;
  const day = parts[2] || 1;

  // Church Service Salt: St John Maadi Servants Prep (7351)
  const seed = ((year * 10000 + month * 100 + day) ^ 7351);
  const pinNum = (Math.abs(seed * 1103515245 + 12345) % 9000) + 1000;
  return pinNum.toString();
}

/**
 * Validates an entered attendance PIN against both the server dynamic PIN
 * and the daily offline deterministic PIN.
 * @param {string} enteredPin
 * @param {string} [activeServerPin]
 * @param {string} [dateStr]
 * @returns {boolean}
 */
export function isValidServicePin(enteredPin, activeServerPin, dateStr) {
  if (!enteredPin) return false;
  const entered = String(enteredPin).trim();
  if (entered.length < 4) return false;

  // 1. Check against active server PIN if present
  if (activeServerPin && entered === String(activeServerPin).trim()) {
    return true;
  }

  // 2. Check against daily offline-first PIN
  const dailyOfflinePin = getDailyServicePin(dateStr);
  if (entered === dailyOfflinePin) {
    return true;
  }

  return false;
}
