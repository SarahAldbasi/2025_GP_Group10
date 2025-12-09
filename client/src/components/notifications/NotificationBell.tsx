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

  // Filter notifications for the current user and sort by timestamp (newest first)
  const webNotifications = notifications
    .filter(notification => {
      // Only show notifications that are explicitly for the logged-in user
      // Check if user.uid is in targetUserIds array
      if (!user?.uid || !notification.targetUserIds || notification.targetUserIds.length === 0) {
        return false;
      }
      const isTargeted = notification.targetUserIds.includes(user.uid);
      if (!isTargeted) {
        console.debug("Notification filtered out:", {
          notificationId: notification.id,
          userUid: user.uid,
          targetUserIds: notification.targetUserIds
        });
      }
      return isTargeted;
    })
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort newest first

  // Check if there are any unread notifications for the current user
  const hasUnread = webNotifications.some(n => user && !(n.readBy || []).includes(user.uid));

  const handleOpen = () => {
    setIsOpen(true);
    if (hasUnread) {
      onMarkAsRead();
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(date);
    } else if (hours > 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (minutes > 0) {
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else {
      return 'Just now';
    }
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
          <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 border-2 border-[#171717]" />
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-[#212121] text-white">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px] px-1">
            {webNotifications.length > 0 ? (
              <div className="space-y-4">
                {webNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="border-b border-[#2b2b2b] pb-2 last:border-none"
                  >
                    <p>{notification.message}</p>
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
