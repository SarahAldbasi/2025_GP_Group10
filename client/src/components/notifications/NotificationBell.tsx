import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';
import type { Notification } from '@/lib/firestore';
import { useAuth } from '@/lib/useAuth';

interface NotificationBellProps {
  notifications: Notification[];
  onMarkAsRead: () => void;
}

export default function NotificationBell({ notifications, onMarkAsRead }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  // Check if there are any unread notifications for the current user
  const hasUnread = notifications.some(n => user && !(n.readBy || []).includes(user.uid));

  const handleOpen = () => {
    setIsOpen(true);
    if (hasUnread) {
      onMarkAsRead();
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        className="relative"
      >
        <Bell className="h-6 w-6 text-white" />
        {hasUnread && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-[#212121] text-white">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px] px-1">
            {notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border-b border-[#2b2b2b] pb-2 last:border-none ${
                      user && !(notification.readBy || []).includes(user.uid) ? 'bg-opacity-10 bg-white' : ''
                    }`}
                  >
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-[#787878] mt-1">
                      {formatTimestamp(notification.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[#787878] py-4">
                No notifications
              </p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}