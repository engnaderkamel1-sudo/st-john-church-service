// Web Push Client Service (Service Worker & PushManager Subscription)
import { doc, updateDoc, getDoc } from 'firebase/firestore';
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
export async function registerServiceWorkerAndSubscribe(user, options = {}) {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Web Push is not supported by this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    let isNewSubscription = false;
    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
      isNewSubscription = true;
    }

    if (subscription && user?.id) {
      const subJson = JSON.stringify(subscription);
      const userRef = doc(db, 'users', user.id);

      // Save subscription supporting multiple devices (Laptop, Phone, Tablet) without overwriting
      try {
        const userSnap = await getDoc(userRef);
        let existingSubs = [];
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (Array.isArray(userData.pushSubscriptions)) {
            existingSubs = userData.pushSubscriptions;
          }
        }

        const currentEndpoint = subscription.endpoint;
        // Keep other device subscriptions, remove existing duplicate of current endpoint
        const filteredSubs = existingSubs.filter(s => {
          try {
            const parsed = typeof s === 'string' ? JSON.parse(s) : s;
            return parsed?.endpoint && parsed.endpoint !== currentEndpoint;
          } catch {
            return false;
          }
        });

        filteredSubs.push(subJson);
        const finalSubs = filteredSubs.slice(-6); // Keep up to 6 devices per servant/user

        await updateDoc(userRef, {
          pushSubscription: subJson, // Backward compatibility
          pushSubscriptions: finalSubs,
          pushUpdatedAt: new Date().toISOString()
        });
      } catch (err) {
        // Fallback update
        await updateDoc(userRef, {
          pushSubscription: subJson,
          pushUpdatedAt: new Date().toISOString()
        }).catch(e => console.warn('Could not save push subscription to Firestore:', e));
      }

      // Only send welcome push once when explicitly requested (e.g. manual toggle click), never on passive app open
      if (options.sendWelcomePush && isNewSubscription) {
        triggerServerPush({
          subscription: subJson,
          title: 'تم تفعيل التنبيهات بنجاح 🔔',
          body: 'ستصلك كافة إشعارات الخدمة حتى وإن كان التطبيق أو المتصفح مغلقاً تماماً!'
        }).catch(() => {});
      }
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
