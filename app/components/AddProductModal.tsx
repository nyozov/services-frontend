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

interface AddProductModalProps {
  storeId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onProductAdded: () => void;
}

export default function AddProductModal({
  storeId,
  isOpen,
  onOpenChange,
  onProductAdded,
}: AddProductModalProps) {
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
    const price = formData.get("price") as string;
    const imageUrl = formData.get("imageUrl") as string;

    try {
      const token = await getToken();

      const response = await fetch("http://localhost:3000/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeId,
          name,
          description: description || undefined,
          price: parseFloat(price),
          imageUrl: imageUrl || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add product");
      }

      // Success - close modal and refresh products
      onOpenChange(false);
      onProductAdded();

      // Reset form
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      console.error("Error adding product:", err);
      setError(err.message || "Failed to add product");
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
              <Modal.Heading>Add New Product</Modal.Heading>
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
                      return "Product name is required";
                    }
                    if (value.length < 3) {
                      return "Product name must be at least 3 characters";
                    }
                    if (value.length > 100) {
                      return "Product name must be less than 100 characters";
                    }
                    return null;
                  }}
                >
                  <Label>Product Name</Label>
                  <Input placeholder="Handmade Wooden Chair" />
                  <FieldError />
                </TextField>

                <TextField name="description">
                  <Label>Description (Optional)</Label>
                  <Input placeholder="Describe your product..." />
                  <Description>
                    Help customers understand what you're selling
                  </Description>
                  <FieldError />
                </TextField>

                <TextField
                  isRequired
                  name="price"
                  type="number"
                  validate={(value) => {
                    const price = parseFloat(value);
                    if (isNaN(price)) {
                      return "Price must be a valid number";
                    }
                    if (price <= 0) {
                      return "Price must be greater than 0";
                    }
                    if (price > 999999.99) {
                      return "Price is too high";
                    }
                    return null;
                  }}
                >
                  <Label>Price</Label>
                  <Input placeholder="29.99" step="0.01" min="0" />
                  <Description>Price in USD</Description>
                  <FieldError />
                </TextField>

                <TextField
                  name="imageUrl"
                  type="url"
                  validate={(value) => {
                    if (value && value.trim().length > 0) {
                      try {
                        new URL(value);
                        return null;
                      } catch {
                        return "Please enter a valid URL";
                      }
                    }
                    return null;
                  }}
                >
                  <Label>Image URL (Optional)</Label>
                  <Input placeholder="https://example.com/image.jpg" />
                  <Description>
                    Link to an image of your product
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
                    {isLoading ? "Adding..." : "Add Product"}
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