import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useNotifications } from '@/lib/useNotifications';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { notifications, markAllAsRead } = useNotifications();

  return (
    <div className="min-h-screen bg-[#171717] text-white flex">
      <div className="fixed inset-y-0 left-0">
        <Sidebar />
      </div>
      <div className="flex-1 pl-72">
        <div className="sticky top-0 z-10 flex justify-end p-4 bg-[#171717]">
          <NotificationBell 
            notifications={notifications}
            onMarkAsRead={markAllAsRead}
          />
        </div>
        <main className="p-8 pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}