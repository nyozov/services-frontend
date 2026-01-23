"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button, Card } from "@heroui/react";
import { IoMdNotificationsOutline, IoMdNotifications } from "react-icons/io";
import { IoCheckmarkDone } from "react-icons/io5";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationDropdown() {
  const { getToken } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchUnreadCount = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(
        "http://localhost:3000/api/notifications/unread-count",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      setUnreadCount(data.count);
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      if (!token) return;

      const response = await fetch("http://localhost:3000/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      setNotifications(data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      await fetch(`http://localhost:3000/api/notifications/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      await fetch("http://localhost:3000/api/notifications/mark-all-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const getNotificationIcon = (type: string) => {
    // You can customize icons based on notification type
    return "🔔";
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        {unreadCount > 0 ? (
          <IoMdNotifications size={24} className="text-primary" />
        ) : (
          <IoMdNotificationsOutline size={24} className="text-gray-700" />
        )}

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Card */}
          <Card className="absolute right-0 mt-2 w-96 max-h-[500px] overflow-hidden z-50 shadow-xl">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={markAllAsRead}
                  className="gap-2"
                >
                  <IoCheckmarkDone size={16} />
                  Mark all read
                </Button>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[400px]">
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <IoMdNotificationsOutline
                    size={48}
                    className="mx-auto mb-2 text-gray-300"
                  />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div>
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? "bg-blue-50" : ""
                      }`}
                      onClick={() =>
                        !notification.read && markAsRead(notification.id)
                      }
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <h4 className="font-semibold text-sm text-gray-900">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
