import { useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';

export function usePushNotifications(user) {
  useEffect(() => {
    if (!user) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function subscribe() {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) return; // already subscribed

        const { data } = await axios.get(`${API}/api/push/vapid-public-key`);
        const converted = urlBase64ToUint8Array(data.publicKey);
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: converted
        });
        await axios.post(`${API}/api/push/subscribe`,
          { subscription },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        console.log('Push subscription registered');
      } catch (err) {
        console.error('Push subscription failed:', err);
      }
    }

    Notification.requestPermission().then(permission => {
      if (permission === 'granted') subscribe();
    });
  }, [user]);
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
