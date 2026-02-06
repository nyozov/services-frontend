"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { Button, Card, Spinner, TextArea, Label } from "@heroui/react";
import { MdMessage } from "react-icons/md";
import { IoArrowBack } from "react-icons/io5";
import { conversationsApi } from "@/lib/services/api";

interface Conversation {
  id: string;
  updatedAt: string;
  participants: Array<{
    user: { id: string; name: string | null; email: string };
    lastReadAt?: string | null;
  }>;
  messages: Array<Message>;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderUser?: { id: string; name: string | null; email: string };
  senderGuest?: { id: string; name: string | null; email: string };
}

export default function InboxPage() {
  const { getToken } = useAuth();
  const { isSignedIn, user } = useUser();
  const searchParams = useSearchParams();
  const initialConversationId = searchParams.get("conversation");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetchMessages(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedConversation || isThreadLoading) return;
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [selectedConversation, isThreadLoading]);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      if (!token) return;
      const data = await conversationsApi.getAll(token);
      setViewerUserId(data.viewerUserId);
      setConversations(data.conversations || []);
      if (!selectedId && data.conversations?.length > 0) {
        setSelectedId(data.conversations[0].id);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      setIsThreadLoading(true);
      const token = await getToken();
      if (!token) return;
      const data = await conversationsApi.getMessages(token, conversationId);
      setViewerUserId(data.viewerUserId);
      setSelectedConversation(data.conversation);
      await conversationsApi.markRead(token, conversationId);
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setIsThreadLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedId || !reply.trim()) return;
    try {
      setSending(true);
      const token = await getToken();
      if (!token) return;
      await conversationsApi.sendMessage({
        content: reply.trim(),
        conversationId: selectedId,
        token,
      });
      setReply("");
      await fetchMessages(selectedId);
      await fetchConversations();
    } catch (err) {
      console.error("Error sending reply:", err);
    } finally {
      setSending(false);
    }
  };

  const getConversationPreview = (conversation: Conversation) => {
    const lastMessage = conversation.messages?.[0];
    if (!lastMessage) {
      return {
        name: "New conversation",
        preview: "Start the conversation",
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
      name: sender,
      preview: lastMessage.content,
      time: lastMessage.createdAt,
      unread: isUnread,
    };
  };

  const currentUserEmail = user?.primaryEmailAddress?.emailAddress;
  const showList = !selectedId;
  const showThread = !!selectedId;

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center">
          <MdMessage size={40} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Sign in to view your inbox
          </h2>
          <p className="text-sm text-gray-600">
            Store owners can respond to customer inquiries here.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inbox</h1>
            <p className="text-gray-600">Manage customer conversations</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 border">
          <Card
            className={`overflow-hidden w-full h-[600px] lg:w-1/4 ${
              showThread ? "hidden lg:block" : "block"
            }`}
          >
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Conversations</h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center gap-4">
                  <Spinner />
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <MdMessage size={32} className="mx-auto mb-2 text-gray-300" />
                  <p>No messages yet</p>
                </div>
              ) : (
                conversations.map((conversation) => {
                  const preview = getConversationPreview(conversation);
                  const isActive = conversation.id === selectedId;
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedId(conversation.id)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                        isActive ? "bg-gray-100" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm font-semibold">
                          {preview.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <p className="font-semibold text-sm text-gray-900 truncate">
                              {preview.name}
                            </p>
                            <span className="text-xs text-gray-400">
                              {new Date(preview.time).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {preview.preview}
                          </p>
                          {preview.unread && (
                            <span className="inline-flex mt-2 h-2 w-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          <Card
            className={`w-full h-[600px] ${
              showThread ? "flex" : "hidden lg:flex"
            } flex-col`}
          >
            <div className="p-4 border-b border-gray-200 flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onPress={() => {
                  setSelectedId(null);
                  setSelectedConversation(null);
                }}
              >
                <IoArrowBack size={16} />
                Back
              </Button>
              <h3 className="font-semibold text-gray-900">
                {selectedConversation ? "Conversation" : "Select a conversation"}
              </h3>
            </div>

            <div
              className="flex-1 p-4 space-y-4 overflow-y-auto"
              ref={messagesContainerRef}
            >
              {isThreadLoading ? (
                <div className="flex items-center gap-4">
                  <Spinner />
                </div>
              ) : selectedConversation ? (
                selectedConversation.messages.map((message) => {
                  const senderName =
                    message.senderUser?.name ||
                    message.senderUser?.email ||
                    message.senderGuest?.name ||
                    message.senderGuest?.email ||
                    "Guest";
                  const isMe =
                    message.senderUser?.email &&
                    message.senderUser.email === currentUserEmail;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                          isMe
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p className="text-xs opacity-70 mb-1">{senderName}</p>
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <p className="text-xs opacity-60 mt-2">
                          {new Date(message.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 py-12">
                  Select a conversation to view messages.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold text-gray-900">
                  Reply
                </Label>
                <span className="text-xs text-gray-500">
                  {reply.length}/1000
                </span>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-gray-900 focus-within:bg-white transition-colors">
                <TextArea
                  value={reply}
                  onChange={(event) => setReply(event.target.value.slice(0, 1000))}
                  rows={3}
                  className="bg-transparent w-full border-0 p-0 text-sm text-gray-900 focus:outline-none focus:ring-0"
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-500">
                  Press send to notify the customer
                </p>
                <Button
                  variant="primary"
                  onPress={handleSend}
                  isDisabled={sending || !reply.trim() || !selectedId}
                >
                  {sending ? "Sending..." : "Send Reply"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
