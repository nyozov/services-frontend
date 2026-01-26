"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { stripeApi } from "@/lib/services/api";
import { Button } from "@heroui/react";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("Verifying payment...");
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      setStatus("error");
      setMessage("No session ID found. Please check your order status.");
      return;
    }

    // Verify the session and update order status
    const verifySession = async () => {
      try {
        console.log("Verifying session:", sessionId);
        const result = await stripeApi.verifySession(sessionId);

        if (result.success) {
          setStatus("success");
          setMessage("Payment successful! Your order has been confirmed.");
          if (result.order?.id) {
            setOrderId(result.order.id);
          }
        } else {
          setStatus("error");
          setMessage(result.message || "Payment verification failed.");
        }
      } catch (error: any) {
        console.error("Error verifying session:", error);
        setStatus("error");
        setMessage(error.message || "Failed to verify payment. Please contact support.");
      }
    };

    verifySession();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === "loading" && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing...</h1>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            {orderId && (
              <p className="text-sm text-gray-500 mb-6">Order ID: {orderId}</p>
            )}
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onPress={() => router.push("/")}
              >
                Continue Shopping
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onPress={() => router.push("/orders")}
              >
                View Orders
              </Button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Button
              variant="primary"
              className="w-full"
              onPress={() => router.push("/orders")}
            >
              Check Order Status
            </Button>
          </>
        )}
      </div>
    </div>
  );
}