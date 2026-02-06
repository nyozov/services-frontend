"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  Button,
  Modal,
  Form,
  TextField,
  Label,
  Input,
  FieldError,
  Description,
  TextArea,
} from "@heroui/react";
import { conversationsApi } from "@/lib/services/api";

interface MessageSellerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  recipientUserId: string;
  storeName: string;
  onSent?: () => void;
}

export default function MessageSellerModal({
  isOpen,
  onOpenChange,
  recipientUserId,
  storeName,
  onSent,
}: MessageSellerModalProps) {
  const { getToken } = useAuth();
  const { isSignedIn, user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestLink, setGuestLink] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setGuestLink(null);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const content = (formData.get("content") as string) || "";
    const name = (formData.get("name") as string) || "";
    const email = (formData.get("email") as string) || "";

    try {
      const token = isSignedIn ? await getToken() : null;

      const result = await conversationsApi.sendMessage({
        content,
        recipientUserId,
        guest: isSignedIn ? undefined : { name, email },
        token,
      });

      if (!isSignedIn && result.guestAccessToken) {
        const link = `${window.location.origin}/guest-inbox?token=${result.guestAccessToken}`;
        setGuestLink(link);
      } else {
        onOpenChange(false);
        onSent?.();
        event.currentTarget.reset();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[520px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Message {storeName}</Modal.Heading>
            </Modal.Header>

            <Modal.Body>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                  {error}
                </div>
              )}

              {guestLink ? (
                <div className="space-y-4">
                  <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-lg text-sm text-emerald-800">
                    Message sent! Save this link to follow up as a guest.
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <code className="text-xs text-gray-600 flex-1 truncate">
                      {guestLink}
                    </code>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => navigator.clipboard.writeText(guestLink)}
                    >
                      Copy
                    </Button>
                  </div>
                  <Button
                    variant="primary"
                    className="w-full"
                    onPress={() => {
                      setGuestLink(null);
                      onOpenChange(false);
                      onSent?.();
                    }}
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                {!isSignedIn && (
                  <>
                    <TextField
                      isRequired
                      name="name"
                      validate={(value) =>
                        !value?.trim() ? "Name is required" : null
                      }
                    >
                      <Label>Your name</Label>
                      <Input placeholder="Jane Doe" />
                      <FieldError />
                    </TextField>

                    <TextField
                      isRequired
                      name="email"
                      validate={(value) => {
                        if (!value?.trim()) return "Email is required";
                        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
                          return "Enter a valid email";
                        return null;
                      }}
                    >
                      <Label>Email</Label>
                      <Input placeholder="you@example.com" />
                      <FieldError />
                    </TextField>
                  </>
                )}

                <TextField
                  isRequired
                  name="content"
                  validate={(value) =>
                    !value?.trim() ? "Message is required" : null
                  }
                >
                  <Label>Message</Label>
                  <TextArea placeholder="How can we help you?" rows={5} />
                  <Description>
                    {isSignedIn
                      ? `Sending as ${user?.primaryEmailAddress?.emailAddress}`
                      : "Your email will be shared with the store owner."}
                  </Description>
                  <FieldError />
                </TextField>

                <div className="flex gap-3 mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onPress={() => onOpenChange(false)}
                    isDisabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    isDisabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send Message"}
                  </Button>
                </div>
              </Form>
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
