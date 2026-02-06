"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Spinner, TextArea } from "@heroui/react";
import { MdMessage } from "react-icons/md";
import { conversationsApi } from "@/lib/services/api";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderUser?: { id: string; name: string | null; email: string };
  senderGuest?: { id: string; name: string | null; email: string };
}

interface Conversation {
  id: string;
  messages: Message[];
  participants: Array<{
    user: { id: string; name: string | null; email: string };
  }>;
}

export default function GuestInboxPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [reply, setReply] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing access token.");
      setIsLoading(false);
      return;
    }
    fetchConversation(token);
  }, [token]);

  const fetchConversation = async (accessToken: string) => {
    try {
      setIsLoading(true);
      const data = await conversationsApi.getGuestConversation(accessToken);
      setConversation(data.conversation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!token || !reply.trim()) return;
    try {
      setIsSending(true);
      await conversationsApi.sendGuestMessage(token, reply.trim());
      setReply("");
      await fetchConversation(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center">
          <MdMessage size={40} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || "Conversation unavailable"}
          </h2>
          <p className="text-sm text-gray-600">
            Please check the link and try again.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Card className="flex flex-col min-h-[600px]">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">
              Conversation
            </h1>
            <p className="text-sm text-gray-500">
              You can reply here as a guest.
            </p>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {conversation.messages.map((message) => {
              const senderName =
                message.senderUser?.name ||
                message.senderUser?.email ||
                message.senderGuest?.name ||
                message.senderGuest?.email ||
                "Guest";
              const isGuest = Boolean(message.senderGuest);

              return (
                <div
                  key={message.id}
                  className={`flex ${isGuest ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      isGuest
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
            })}
          </div>

          <div className="p-4 border-t border-gray-200 space-y-3">
            <TextArea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Type your reply..."
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                variant="primary"
                onPress={handleSend}
                isDisabled={isSending || !reply.trim()}
              >
                {isSending ? "Sending..." : "Send Reply"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
