// Centralized Notification Utilities (Web Audio Synth Chime & Browser Notification)

let audioCtx = null;

/**
 * Plays an elegant, church-appropriate 2-note chime tone using Web Audio API.
 * Requires zero external audio files and works 100% offline.
 */
export function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const now = audioCtx.currentTime;

    // First note: C5 (523.25 Hz)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Second note: G5 (783.99 Hz)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (err) {
    console.warn('Audio chime playback error:', err);
  }
}

/**
 * Dispatches an OS/Browser Notification if permission was granted.
 */
export function triggerBrowserNotification(title, options = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const defaultOptions = {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    dir: 'rtl',
    lang: 'ar',
    ...options
  };

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, defaultOptions);
      }).catch(() => {
        new Notification(title, defaultOptions);
      });
    } else {
      new Notification(title, defaultOptions);
    }
  } catch (e) {
    console.warn('Browser notification trigger failed:', e);
  }
}

/**
 * Formats notification creation date into a dynamic relative Arabic time string (e.g. 'الآن', 'منذ 5 دقائق', 'منذ ساعتين', 'أمس').
 */
export function formatNotificationTime(notif) {
  if (!notif) return '';

  let dateObj = null;
  if (notif.createdAt) {
    if (typeof notif.createdAt.toDate === 'function') {
      dateObj = notif.createdAt.toDate();
    } else if (typeof notif.createdAt === 'object' && notif.createdAt.seconds) {
      dateObj = new Date(notif.createdAt.seconds * 1000);
    } else if (typeof notif.createdAt === 'string') {
      dateObj = new Date(notif.createdAt);
    }
  } else if (notif.date) {
    dateObj = new Date(notif.date);
  }

  // If no valid timestamp, fallback to time string if it's not the static placeholder 'الآن'
  if (!dateObj || isNaN(dateObj.getTime())) {
    if (notif.time && notif.time !== 'الآن') return notif.time;
    return 'الآن';
  }

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  // If within the last 45 seconds
  if (diffSec < 45 && diffSec >= -30) return 'الآن';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin <= 1) return 'منذ دقيقة';
  if (diffMin === 2) return 'منذ دقيقتين';
  if (diffMin <= 10) return `منذ ${diffMin} دقائق`;
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return 'منذ ساعة';
  if (diffHours === 2) return 'منذ ساعتين';
  if (diffHours <= 10) return `منذ ${diffHours} ساعات`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'أمس';
  if (diffDays === 2) return 'منذ يومين';
  if (diffDays <= 10) return `منذ ${diffDays} أيام`;

  return dateObj.toLocaleDateString('ar-EG-u-nu-latn', {
    day: 'numeric',
    month: 'short'
  });
}

/**
 * Safely extracts milliseconds timestamp from any notification object.
 * Supports Firestore Timestamp, milliseconds, ISO date strings, birthday alerts, or pending server writes.
 */
export function getNotificationTimestamp(notif) {
  if (!notif) return 0;

  // Active birthday alert (priority for current day)
  if (notif.isBirthday) {
    return Date.now();
  }

  if (notif.createdAt) {
    if (typeof notif.createdAt.toMillis === 'function') {
      return notif.createdAt.toMillis();
    }
    if (typeof notif.createdAt.toDate === 'function') {
      return notif.createdAt.toDate().getTime();
    }
    if (typeof notif.createdAt === 'object' && notif.createdAt.seconds) {
      return notif.createdAt.seconds * 1000 + (notif.createdAt.nanoseconds ? Math.floor(notif.createdAt.nanoseconds / 1000000) : 0);
    }
    if (typeof notif.createdAt === 'number') {
      return notif.createdAt;
    }
    if (typeof notif.createdAt === 'string') {
      const parsed = new Date(notif.createdAt).getTime();
      if (!isNaN(parsed)) return parsed;
    }
  }

  if (notif.date) {
    const parsed = new Date(notif.date).getTime();
    if (!isNaN(parsed)) return parsed;
  }

  // Newly dispatched notification locally with pending serverTimestamp
  if (notif.time === 'الآن') {
    return Date.now();
  }

  return 0;
}
