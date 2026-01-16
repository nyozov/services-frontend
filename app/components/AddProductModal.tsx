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

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Upload image to Cloudinary
  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
    );

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!res.ok) {
      throw new Error("Image upload failed");
    }

    return res.json();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = formData.get("price") as string;

    try {
      let uploadedImage: { secure_url: string; public_id: string } | null =
        null;

      if (imageFile) {
        uploadedImage = await uploadToCloudinary(imageFile);
      }

      const token = await getToken();

      // Send as images array
      const payload = {
        storeId,
        name,
        description: description || undefined,
        price: parseFloat(price),
        images: uploadedImage
          ? [
              {
                url: uploadedImage.secure_url,
                publicId: uploadedImage.public_id,
              },
            ]
          : [],
      };

      const response = await fetch("http://localhost:3000/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add product");
      }

      // Success
      onOpenChange(false);
      onProductAdded();

      // Reset form + image state
      (e.target as HTMLFormElement).reset();
      setImageFile(null);
      setImagePreview(null);
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
                {/* Product Name */}
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

                {/* Description */}
                <TextField name="description">
                  <Label>Description (Optional)</Label>
                  <Input placeholder="Describe your product..." />
                  <Description>
                    Help customers understand what you're selling
                  </Description>
                  <FieldError />
                </TextField>

                {/* Price */}
                <TextField
                  isRequired
                  name="price"
                  type="number"
                  validate={(value) => {
                    const price = parseFloat(value);
                    if (isNaN(price)) return "Price must be a valid number";
                    if (price <= 0) return "Price must be greater than 0";
                    if (price > 999999.99) return "Price is too high";
                    return null;
                  }}
                >
                  <Label>Price</Label>
                  <Input placeholder="29.99" step="0.01" min="0" />
                  <Description>Price in USD</Description>
                  <FieldError />
                </TextField>

                {/* Image Upload */}
                <div className="flex flex-col gap-2">
                  <Label>Product Image</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }}
                  />
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="mt-2 h-32 w-32 object-cover rounded-md border"
                    />
                  )}
                  <Description>JPG, PNG, or WebP. Max 5MB.</Description>
                </div>

                {/* Actions */}
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
