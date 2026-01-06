const API_BASE = '/.netlify/functions';

/**
 * Check if push notifications are supported in this browser
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Get the current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request permission for push notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported');
  }
  return await Notification.requestPermission();
}

/**
 * Get the VAPID public key from the server
 */
export async function getVapidPublicKey(): Promise<string> {
  const res = await fetch(`${API_BASE}/vapid-public-key`);
  if (!res.ok) {
    throw new Error('Failed to fetch VAPID public key');
  }
  const data = await res.json();
  return data.publicKey;
}

/**
 * Convert a base64 string to a Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.log('Push notifications not supported');
    return null;
  }

  // Request permission if not already granted
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    console.log('Notification permission denied');
    return null;
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Get VAPID public key
    const vapidPublicKey = await getVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    // Send subscription to server
    const res = await fetch(`${API_BASE}/push-subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    });

    if (!res.ok) {
      throw new Error('Failed to save push subscription');
    }

    console.log('Push subscription successful');
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Remove from server
      await fetch(`${API_BASE}/push-subscriptions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      // Unsubscribe locally
      await subscription.unsubscribe();
    }

    return true;
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    return false;
  }
}

/**
 * Check if currently subscribed to push notifications
 */
export async function isSubscribedToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

// Local storage keys for tracking seen reviews
const LAST_SEEN_REVIEW_KEY = 'lastSeenReviewAt';

/**
 * Get the timestamp of when reviews were last checked
 */
export function getLastSeenReviewTime(): string | null {
  return localStorage.getItem(LAST_SEEN_REVIEW_KEY);
}

/**
 * Update the last seen review timestamp to now
 */
export function markReviewsAsSeen(): void {
  localStorage.setItem(LAST_SEEN_REVIEW_KEY, new Date().toISOString());
}

/**
 * Check if push notification permission has been asked before
 */
const PUSH_PERMISSION_ASKED_KEY = 'pushPermissionAsked';

export function hasPushPermissionBeenAsked(): boolean {
  return localStorage.getItem(PUSH_PERMISSION_ASKED_KEY) === 'true';
}

export function markPushPermissionAsked(): void {
  localStorage.setItem(PUSH_PERMISSION_ASKED_KEY, 'true');
}

