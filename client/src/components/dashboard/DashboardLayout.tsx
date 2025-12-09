import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useNotifications } from '@/lib/useNotifications';

interface DashboardLayoutProps {
  children: ReactNode;
  /** When true, shrinks the UI ~15% and expands width to match (no horizontal scrollbar). */
  compact?: boolean;
}

export default function DashboardLayout({ children, compact }: DashboardLayoutProps) {
  const { notifications, markAllAsRead } = useNotifications();

  return (
    <div className="min-h-screen bg-[#171717] text-white flex">
      <div className="fixed inset-y-0 left-0">
        <Sidebar />
      </div>

      <div className="flex-1 pl-48">
        {/* Header */}
        <div className="sticky top-0 z-10 flex justify-end p-4 bg-[#171717]">
          <NotificationBell
            notifications={notifications}
            onMarkAsRead={markAllAsRead}
          />
        </div>

        {/* Main content */}
        <main className="p-8 pt-0 overflow-x-hidden">
          <div
            className={
              compact
                ? 'transform-gpu scale-[0.75] origin-top-left [width:calc(100%/0.75)]'
                : ''
            }
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
