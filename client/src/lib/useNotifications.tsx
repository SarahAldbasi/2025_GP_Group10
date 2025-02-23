import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Notification } from '@/components/notifications/NotificationBell';
import { subscribeToNotifications, markNotificationsAsRead, addNotification as addFirestoreNotification } from '@/lib/firestore';
import { useAuth } from '@/lib/useAuth';

interface NotificationsContextType {
  notifications: Notification[];
  addNotification: (message: string) => void;
  markAllAsRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    // Subscribe to user-specific notifications
    const unsubscribe = subscribeToNotifications(user.uid, (notifications) => {
      setNotifications(notifications);
    });

    return () => unsubscribe();
  }, [user]);

  const addNotification = useCallback((message: string) => {
    if (!user) return;
    addFirestoreNotification(user.uid, message);
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