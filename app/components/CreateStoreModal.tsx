"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Button,
  Modal,
  Form,
  TextField,
  Label,
  Input,
  FieldError,
  Description,
} from "@heroui/react";

interface CreateStoreModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onStoreCreated: () => void;
}

export default function CreateStoreModal({
  isOpen,
  onOpenChange,
  onStoreCreated,
}: CreateStoreModalProps) {
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    try {
      const token = await getToken();

      const response = await fetch("http://localhost:3000/api/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create store");
      }

      // Success - close modal and refresh stores
      onOpenChange(false);
      onStoreCreated();

      // Reset form
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      console.error("Error creating store:", err);
      setError(err.message || "Failed to create store");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[500px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Create New Store</Modal.Heading>
            </Modal.Header>

            <Modal.Body>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                  {error}
                </div>
              )}

              <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <TextField
                  isRequired
                  name="name"
                  validate={(value) => {
                    if (!value || value.trim().length === 0) {
                      return "Store name is required";
                    }
                    if (value.length < 3) {
                      return "Store name must be at least 3 characters";
                    }
                    if (value.length > 50) {
                      return "Store name must be less than 50 characters";
                    }
                    return null;
                  }}
                >
                  <Label>Store Name</Label>
                  <Input placeholder="My Awesome Store" />
                  <Description>
                    This will be displayed as your store's title
                  </Description>
                  <FieldError />
                </TextField>

                <TextField name="description">
                  <Label>Description (Optional)</Label>
                  <Input placeholder="Tell customers about your store..." />
                  <Description>
                    A brief description of what you sell
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
                    {isLoading ? "Creating..." : "Create Store"}
                  </Button>
                </div>
              </Form>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}