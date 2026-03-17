import { useEffect } from 'react';
import axios from 'axios';

export function usePushNotifications(user) {
  useEffect(() => {
    if (!user) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function subscribe() {
      try {
        const pushReg = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
        await navigator.serviceWorker.ready;
        
        const existing = await pushReg.pushManager.getSubscription();
        if (existing) return;

        const { data } = await axios.get(`${import.meta.env.VITE_API_URL.replace(/\/api$/, '')}/api/push/vapid-public-key`);
        const converted = urlBase64ToUint8Array(data.publicKey);
        const subscription = await pushReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: converted
        });
        await axios.post(`${import.meta.env.VITE_API_URL.replace(/\/api$/, '')}/api/push/subscribe`,
          { subscription },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
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
