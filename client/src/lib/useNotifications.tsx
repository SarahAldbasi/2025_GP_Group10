import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Notification } from '@/components/notifications/NotificationBell';

interface NotificationsContextType {
  notifications: Notification[];
  addNotification: (message: string) => void;
  markAllAsRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: string) => {
    setNotifications(prev => [
      {
        id: Date.now().toString(),
        message,
        timestamp: new Date(),
        read: false
      },
      ...prev
    ]);
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

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
