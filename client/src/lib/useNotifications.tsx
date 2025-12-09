import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import type { Notification as FirestoreNotification } from '@/lib/firestore';
import { 
  subscribeToNotifications, 
  markNotificationsAsRead, 
  addNotification as addFirestoreNotification,
  addFCMToken,
  removeFCMToken 
} from '@/lib/firestore';
import { useAuth } from '@/lib/useAuth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import app from '@/lib/firebase'; // Fixed import to use default export

interface NotificationsContextType {
  notifications: FirestoreNotification[];
  addNotification: (message: string, targetUserIds?: string[]) => Promise<void>;
  markAllAsRead: () => void;
  registerDevice: () => Promise<void>;
  unregisterDevice: () => Promise<void>;
  sendPushToUsers: (message: string, targetUserIds: string[]) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<FirestoreNotification[]>([]);
  const { user } = useAuth();
  const [currentToken, setCurrentToken] = useState<string | null>(null);

  // Initialize Firebase Cloud Messaging
  useEffect(() => {
    if (!user) return;

    const initializeFCM = async () => {
      try {
        const messaging = getMessaging(app);

        // Handle foreground messages
        onMessage(messaging, (payload) => {
          console.log('Received foreground message:', payload);
          // You can show a toast notification here
          if (payload.notification) {
            // Add the notification to Firestore to ensure consistency
            addFirestoreNotification(
              payload.notification.body || 'New notification',
              [user.uid]
            );
          }
        });
      } catch (error) {
        console.error('Error initializing FCM:', error);
      }
    };

    initializeFCM();
  }, [user]);

  // Subscribe to notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    console.log("Setting up notification subscription for user:", user.uid);
    const unsubscribe = subscribeToNotifications(user.uid, (firestoreNotifications) => {
      console.log("Received notifications update:", {
        totalNotifications: firestoreNotifications.length,
        userUid: user.uid,
        notifications: firestoreNotifications.map(n => ({
          id: n.id,
          message: n.message ? n.message.substring(0, 50) : "No message",
          targetUserIds: n.targetUserIds,
          isForUser: n.targetUserIds?.includes(user.uid)
        }))
      });
      setNotifications(firestoreNotifications);
    });

    return () => unsubscribe();
  }, [user]);

  const registerDevice = useCallback(async () => {
    if (!user) return;

    try {
      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });

      if (token) {
        console.log('Got FCM token:', token.substring(0, 10) + '...');
        await addFCMToken(user.uid, token);
        setCurrentToken(token);
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
    }
  }, [user]);

  const unregisterDevice = useCallback(async () => {
    if (!user || !currentToken) return;

    try {
      await removeFCMToken(user.uid, currentToken);
      setCurrentToken(null);
    } catch (error) {
      console.error('Error removing FCM token:', error);
    }
  }, [user, currentToken]);

  // Helper to send push notifications to users
  const sendPushToUsers = useCallback(async (message: string, targetUserIds: string[]) => {
    if (!targetUserIds || targetUserIds.length === 0) {
      console.warn("No target users specified for push notification");
      return;
    }

    const apiUrl = import.meta.env.VITE_API_BASE_URL 
      ? `${import.meta.env.VITE_API_BASE_URL}/api/send-notification`
      : '/api/send-notification';
    
    try {
      await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          targetUserIds,
        }),
      });
      console.log("Push notification sent successfully to", targetUserIds.length, "users");
    } catch (error) {
      console.error("Failed to send push notification:", error);
      // Don't throw - Firestore notification was already created
    }
  }, []);

  const addNotification = useCallback(async (message: string, targetUserIds?: string[]) => {
    if (!user) return;
    
    // Send push notification to mobile if applicable
    if (!targetUserIds || targetUserIds.length === 0) {
      console.warn("⚠️ No target users specified — skipping notification");
      return;
    }
      await addFirestoreNotification(message, targetUserIds);
      
      // Use environment variable for API URL, fallback to relative URL for production
      const apiUrl = import.meta.env.VITE_API_BASE_URL 
        ? `${import.meta.env.VITE_API_BASE_URL}/api/send-notification`
        : '/api/send-notification';
      
      try {
        await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            targetUserIds,
          }),
        });
      } catch (error) {
        console.error("Failed to send push notification:", error);
        // Don't throw - Firestore notification was already created
      }    
  }, [user]);
  
  // const addNotification = useCallback(async (message: string, targetUserIds?: string[]) => {
  //   if (!user) return;
  //   await addFirestoreNotification(message, targetUserIds);
  // }, [user]);

  const markAllAsRead = useCallback(() => {
    if (!user) return;
    markNotificationsAsRead(user.uid);
  }, [user]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        addNotification,
        markAllAsRead,
        registerDevice,
        unregisterDevice,
        sendPushToUsers
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}