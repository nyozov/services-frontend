"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Button, Card } from "@heroui/react";
import { MdMessage } from "react-icons/md";
import { IoMailOutline } from "react-icons/io5";
import { conversationsApi } from "@/lib/services/api";

interface Conversation {
  id: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    content: string;
    createdAt: string;
    senderUser?: { id: string; name: string | null; email: string };
    senderGuest?: { id: string; name: string | null; email: string };
  }>;
  participants: Array<{
    user: { id: string; name: string | null; email: string };
    lastReadAt?: string | null;
  }>;
}

export default function InboxDropdown() {
  const { getToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      fetchUnreadCount();
    }
  }, [isOpen]);

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await conversationsApi.getUnreadCount(token);
      setUnreadCount(data.count || 0);
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  };

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      if (!token) return;

      const data = await conversationsApi.getAll(token);
      setViewerUserId(data.viewerUserId);
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getPreview = (conversation: Conversation) => {
    const lastMessage = conversation.messages?.[0];
    if (!lastMessage) {
      return {
        sender: "New conversation",
        content: "Start the conversation",
        time: conversation.updatedAt,
        unread: false,
      };
    }

    const sender =
      lastMessage.senderGuest?.name ||
      lastMessage.senderGuest?.email ||
      lastMessage.senderUser?.name ||
      lastMessage.senderUser?.email ||
      "Someone";

    const participant = conversation.participants.find(
      (p) => p.user.id === viewerUserId
    );
    const lastReadAt = participant?.lastReadAt
      ? new Date(participant.lastReadAt).getTime()
      : 0;
    const lastMessageAt = new Date(lastMessage.createdAt).getTime();
    const isUnread =
      lastMessageAt > lastReadAt &&
      lastMessage.senderUser?.id !== viewerUserId;

    return {
      sender,
      content: lastMessage.content,
      time: lastMessage.createdAt,
      unread: isUnread,
    };
  };

  const handleOpenConversation = async (conversationId: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      await conversationsApi.markRead(token, conversationId);
      await fetchUnreadCount();
    } catch (err) {
      console.error("Error marking conversation read:", err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Inbox"
      >
        <MdMessage size={22} className="text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <Card className="absolute right-0 mt-2 w-96 max-h-[500px] overflow-hidden z-50 shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Inbox</h3>
                <p className="text-xs text-gray-500">
                  {unreadCount} new messages
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={async () => {
                      const token = await getToken();
                      if (!token) return;
                      await conversationsApi.markAllRead(token);
                      await fetchUnreadCount();
                    }}
                  >
                    Mark all read
                  </Button>
                )}
                <Link href="/inbox">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <IoMailOutline size={16} />
                    Open Inbox
                  </Button>
                </Link>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[400px]">
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MdMessage size={40} className="mx-auto mb-2 text-gray-300" />
                  <p>No messages yet</p>
                </div>
              ) : (
                <div>
                  {conversations.slice(0, 6).map((conversation) => {
                    const preview = getPreview(conversation);
                    return (
                      <Link
                        href={`/inbox?conversation=${conversation.id}`}
                        key={conversation.id}
                        onClick={() => handleOpenConversation(conversation.id)}
                      >
                        <div className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm font-semibold">
                              {preview.sender[0]}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <h4 className="font-semibold text-sm text-gray-900">
                                  {preview.sender}
                                </h4>
                                <span className="text-xs text-gray-400">
                                  {new Date(preview.time).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {preview.content}
                              </p>
                              {preview.unread && (
                                <span className="inline-flex mt-2 h-2 w-2 rounded-full bg-blue-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
