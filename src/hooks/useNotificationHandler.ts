import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

export const useNotificationHandler = () => {
  const router = useRouter();

  useEffect(() => {
    // Handle notification taps when app is in foreground
    const foregroundSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      
      console.log('🔔 [NotificationHandler] Notification tapped:', data);

      if (data.screen === 'authorize-vouchers') {
        router.push('/authorize-vouchers');
      }
    });

    // Handle notification received while app is in foreground
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('🔔 [NotificationHandler] Notification received in foreground:', notification);
    });

    return () => {
      foregroundSubscription.remove();
      receivedSubscription.remove();
    };
  }, [router]);
};

