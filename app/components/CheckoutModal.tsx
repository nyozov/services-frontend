"use client";

import { useState } from "react";
import {
  Button,
  Modal,
  Form,
  TextField,
  Label,
  Input,
  FieldError,
} from "@heroui/react";
import { IoCartOutline } from "react-icons/io5";
import { stripeApi } from "@/lib/services/api";
import { useUser } from "@clerk/nextjs";

interface CheckoutModalProps {
  itemId: string;
  itemName: string;
  itemPrice: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CheckoutModal({
  itemId,
  itemName,
  itemPrice,
  isOpen,
  onOpenChange,
}: CheckoutModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user, isSignedIn, isLoaded } = useUser();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);

    const email = user
      ? user.emailAddresses[0].emailAddress
      : (formData.get("email") as string);

    try {
      // Create Stripe Checkout session
      const { url } = await stripeApi.createCheckoutSession(itemId, email);

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "Failed to start checkout");
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
              <Modal.Heading>Checkout</Modal.Heading>
            </Modal.Header>

            <Modal.Body>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                  {error}
                </div>
              )}

              {/* Order Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Order Summary
                </h3>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">{itemName}</span>
                  <span className="font-bold text-primary">
                    ${itemPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                {!isSignedIn && (
                  <TextField
                    isRequired
                    name="email"
                    type="email"
                    validate={(value) => {
                      if (
                        !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)
                      ) {
                        return "Please enter a valid email address";
                      }
                      return null;
                    }}
                  >
                    <Label>Email Address</Label>
                    <Input placeholder="you@example.com" />
                    <FieldError />
                  </TextField>
                )}

                <div className="text-xs text-gray-500">
                  You'll receive order confirmation and updates at{" "}
                  {user
                    ? user.emailAddresses[0].emailAddress
                    : "this email address."}
                </div>

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
                    className="flex-1 gap-2"
                    isDisabled={isLoading}
                  >
                    {isLoading ? (
                      "Processing..."
                    ) : (
                      <>
                        <IoCartOutline size={20} />
                        Continue to Payment
                      </>
                    )}
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
