// Web Push Client Service (Service Worker & PushManager Subscription)
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const VAPID_PUBLIC_KEY = 'BAtx_VsX7sQqBLrErkVgQhJXjecTxKV0ohn_ICVeQsAjuskf2dAqTKA3982-WlTVeDiPMQ9ubQaBmfnlgW07660';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers service worker /sw.js, subscribes device to Web Push,
 * and saves the subscription to user profile in Firestore.
 */
export async function registerServiceWorkerAndSubscribe(user) {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Web Push is not supported by this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    if (subscription && user?.id) {
      const subJson = JSON.stringify(subscription);
      // Save subscription on user document in Firestore
      await updateDoc(doc(db, 'users', user.id), {
        pushSubscription: subJson,
        pushUpdatedAt: new Date().toISOString()
      }).catch(err => console.warn('Could not save push subscription to Firestore:', err));

      // Test push to verify device receives it
      triggerServerPush({
        subscription: subJson,
        title: 'تم تفعيل التنبيهات بنجاح 🔔',
        body: 'ستصلك كافة إشعارات الخدمة حتى وإن كان التطبيق أو المتصفح مغلقاً تماماً!'
      }).catch(() => {});
    }

    return subscription;
  } catch (err) {
    console.warn('Error subscribing to web push:', err);
    return null;
  }
}

/**
 * Triggers background Web Push to target user(s) or roles via /api/send-push
 */
export async function triggerServerPush(payload) {
  try {
    const res = await fetch('/api/send-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.warn('Server push dispatch error:', err);
    return null;
  }
}
