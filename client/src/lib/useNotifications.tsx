import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import type { Notification as FirestoreNotification } from '@/lib/firestore';
import { subscribeToNotifications, markNotificationsAsRead, addNotification as addFirestoreNotification } from '@/lib/firestore';
import { useAuth } from '@/lib/useAuth';

interface NotificationsContextType {
  notifications: FirestoreNotification[];
  addNotification: (message: string) => Promise<void>;
  markAllAsRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<FirestoreNotification[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    // Subscribe to user-specific notifications
    const unsubscribe = subscribeToNotifications(user.uid, (firestoreNotifications) => {
      setNotifications(firestoreNotifications);
    });

    return () => unsubscribe();
  }, [user]);

  const addNotification = useCallback(async (message: string) => {
    if (!user) return;
    await addFirestoreNotification(message);
  }, [user]);

  const markAllAsRead = useCallback(() => {
    if (!user) return;
    markNotificationsAsRead(user.uid);
  }, [user]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        addNotification,
        markAllAsRead
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