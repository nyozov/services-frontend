"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Spinner } from "@heroui/react";
import {
  IoArrowBack,
  IoCartOutline,
  IoHeartOutline,
  IoStarOutline,
  IoShieldCheckmarkOutline,
  IoCardOutline,
  IoLockClosedOutline,
  IoCheckmarkCircleOutline,
} from "react-icons/io5";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { stripeApi } from "@/lib/services/api";
import { useUser } from "@clerk/nextjs";

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  primaryColor?: string;
}

interface Item {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: Array<{
    id: string;
    url: string;
    publicId: string;
    position: number;
  }>;
  isActive: boolean;
}

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export default function ProductPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const productId = params.id as string;
  const { user, isLoaded } = useUser();

  const [store, setStore] = useState<Store | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const hasCreatedIntentRef = useRef(false);
  const [retryCounter, setRetryCounter] = useState(0);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

  useEffect(() => {
    fetchData();
  }, [slug, productId]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    const email = user.primaryEmailAddress?.emailAddress;
    if (email && !buyerEmail) {
      setBuyerEmail(email);
    }
  }, [isLoaded, user, buyerEmail]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [storeResponse, itemsResponse] = await Promise.all([
        fetch(`${apiBase}/stores/${slug}`),
        fetch(`${apiBase}/stores/${slug}/items`),
      ]);

      if (!storeResponse.ok) throw new Error("Failed to load store");
      if (!itemsResponse.ok) throw new Error("Failed to load product");

      const storeData = await storeResponse.json();
      const items = await itemsResponse.json();

      const foundItem = items.find((i: Item) => i.id === productId) || null;

      setStore(storeData);
      setItem(foundItem);
      setImageIndex(0);
    } catch (err) {
      console.error("Error loading product:", err);
      setItem(null);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedImages = useMemo(() => {
    if (!item?.images) return [];
    return [...item.images].sort((a, b) => a.position - b.position);
  }, [item]);

  useEffect(() => {
    if (!item || !stripePromise) return;
    if (hasCreatedIntentRef.current) return;

    const cacheKey = `checkout:${item.id}`;
    const idempotencyKeyStorage = `checkout:intent:${item.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as {
          clientSecret?: string;
          paymentIntentId?: string;
          orderId?: string;
          createdAt?: number;
        };

        const isFresh =
          parsed.createdAt && Date.now() - parsed.createdAt < 10 * 60 * 1000;

        if (parsed.clientSecret && parsed.paymentIntentId && isFresh) {
          setClientSecret(parsed.clientSecret);
          setPaymentIntentId(parsed.paymentIntentId);
          setOrderId(parsed.orderId ?? null);
          hasCreatedIntentRef.current = true;
          return;
        }

        sessionStorage.removeItem(cacheKey);
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    let isMounted = true;
    const createIntent = async () => {
      setIsCreatingIntent(true);
      setStatus("idle");
      setStatusMessage(null);
      try {
        let idempotencyKey = sessionStorage.getItem(idempotencyKeyStorage);
        if (!idempotencyKey) {
          idempotencyKey =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `intent_${Date.now()}_${Math.random().toString(16).slice(2)}`;
          sessionStorage.setItem(idempotencyKeyStorage, idempotencyKey);
        }

        const result = await stripeApi.createPaymentIntent(
          item.id,
          undefined,
          idempotencyKey
        );
        if (!isMounted) return;
        const nextClientSecret = result.clientSecret;
        const nextPaymentIntentId = result.paymentIntentId ?? null;
        const nextOrderId = result.orderId ?? null;

        setClientSecret(nextClientSecret);
        setPaymentIntentId(nextPaymentIntentId);
        setOrderId(nextOrderId);

        if (nextPaymentIntentId && nextOrderId) {
          sessionStorage.setItem(`orderId:${nextPaymentIntentId}`, nextOrderId);
        }
        if (nextClientSecret && nextPaymentIntentId) {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              clientSecret: nextClientSecret,
              paymentIntentId: nextPaymentIntentId,
              orderId: nextOrderId,
              createdAt: Date.now(),
            })
          );
        }
        hasCreatedIntentRef.current = true;
      } catch (error: any) {
        if (!isMounted) return;
        setStatus("error");
        setStatusMessage(error.message ?? "Failed to start checkout.");
      } finally {
        if (!isMounted) return;
        setIsCreatingIntent(false);
      }
    };
    createIntent();
    return () => {
      isMounted = false;
    };
  }, [item, retryCounter]);

  useEffect(() => {
    if (!stripePromise) return;
    const clientSecret = searchParams.get("payment_intent_client_secret");
    const paymentIntentFromQuery = searchParams.get("payment_intent");

    if (!clientSecret) return;

    stripePromise.then((stripe) => {
      if (!stripe) return;
      stripe.retrievePaymentIntent(clientSecret).then(async (result) => {
        if (result.error) {
          setStatus("error");
          setStatusMessage(result.error.message ?? "Payment verification failed.");
          return;
        }

        if (result.paymentIntent?.status === "succeeded") {
          if (paymentIntentFromQuery) {
            try {
              await stripeApi.syncPaymentIntent(paymentIntentFromQuery);
              const storedOrderId = sessionStorage.getItem(
                `orderId:${paymentIntentFromQuery}`
              );
              if (storedOrderId) {
                setOrderId(storedOrderId);
              }
            } catch (error: any) {
              setStatus("error");
              setStatusMessage(error.message ?? "Failed to sync order.");
              return;
            }
          }
          setStatus("success");
          setStatusMessage("Payment successful! Your order has been confirmed.");
        }
      });
    });
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!store || !item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Product not found
          </h2>
          <Link href={`/store/${slug}`}>
            <Button variant="ghost" className="mt-4">
              Back to store
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const activeImage =
    sortedImages[imageIndex]?.url || sortedImages[0]?.url || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href={`/store/${slug}`} className="inline-flex items-center gap-2 text-sm text-gray-600">
          <IoArrowBack size={16} />
          Back to {store.name}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr,0.9fr] gap-10 mt-6">
          <div className="space-y-5">
            <div className="rounded-3xl overflow-hidden bg-white border border-gray-200 shadow-sm">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={item.name}
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-gray-400">
                  No image
                </div>
              )}
            </div>

            {sortedImages.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {sortedImages.map((image, index) => (
                  <button
                    key={image.id || image.url}
                    onClick={() => setImageIndex(index)}
                    className={`rounded-2xl overflow-hidden border ${
                      index === imageIndex
                        ? "border-gray-900"
                        : "border-gray-200"
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={`${item.name} ${index + 1}`}
                      className="w-full aspect-square object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <Card className="p-6 border border-gray-200/80">
              <h3 className="text-lg font-semibold text-gray-900">Product details</h3>
              <p className="mt-2 text-sm text-gray-600">
                Crafted for modern buyers with fast shipping and easy returns.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
                <div className="rounded-xl border border-gray-200 p-3">Ships in 2-4 days</div>
                <div className="rounded-xl border border-gray-200 p-3">Free returns</div>
              </div>
            </Card>
          </div>

          <div className="space-y-6 lg:sticky lg:top-8">
            <Card className="p-6 border border-blue-100/70 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">
                    {item.name}
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                    <IoStarOutline size={16} />
                    4.9 · 120 reviews
                  </div>
                </div>
                <Button isIconOnly variant="secondary">
                  <IoHeartOutline size={18} />
                </Button>
              </div>

              <div className="mt-4 text-3xl font-semibold text-gray-900">
                ${Number(item.price).toFixed(2)}
                <span className="text-sm text-gray-500 font-normal"> / item</span>
              </div>

              {item.description && (
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="rounded-full bg-gray-100 px-3 py-1">Visa</span>
                <span className="rounded-full bg-gray-100 px-3 py-1">Mastercard</span>
                <span className="rounded-full bg-gray-100 px-3 py-1">Amex</span>
                <span className="rounded-full bg-gray-100 px-3 py-1">Apple Pay</span>
              </div>

              <div className="mt-6 border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <IoLockClosedOutline size={16} />
                    Secure checkout
                  </div>
                  <div className="flex items-center gap-2">
                    <IoCardOutline size={16} />
                    Stripe Elements
                  </div>
                </div>

                {!stripePromise && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Stripe publishable key is missing. Set{" "}
                    <span className="font-semibold">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</span>{" "}
                    to enable payments.
                  </div>
                )}

                {status === "success" ? (
                  <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-700">
                    <div className="flex items-center gap-2 text-base font-semibold text-green-900">
                      <IoCheckmarkCircleOutline size={20} />
                      Payment successful
                    </div>
                    <p className="mt-2">
                      {statusMessage ?? "Your order has been confirmed."}
                    </p>
                    {orderId && (
                      <p className="mt-2 text-xs text-green-800">Order ID: {orderId}</p>
                    )}
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {status === "error" && statusMessage && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {statusMessage}
                      </div>
                    )}

                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">Contact</div>
                          <div className="text-xs text-gray-500">
                            Receipts and order updates.
                          </div>
                        </div>
                        {user && (
                          <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Signed in
                          </div>
                        )}
                      </div>
                      <div className="mt-4 grid gap-3">
                        {!user && (
                          <Input
                            type="email"
                            label="Email address"
                            placeholder="you@example.com"
                            value={buyerEmail}
                            onChange={(event) => setBuyerEmail(event.target.value)}
                          />
                        )}
                        {user && (
                          <Input type="email" label="Email address" value={buyerEmail} isReadOnly />
                        )}
                      </div>
                    </div>

                    {clientSecret && stripePromise ? (
                      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <Elements stripe={stripePromise} options={{ clientSecret }}>
                          <CheckoutForm
                            buyerEmail={buyerEmail}
                            paymentIntentId={paymentIntentId}
                            onSuccess={() => {
                              setStatus("success");
                              setStatusMessage("Payment successful! Your order has been confirmed.");
                            }}
                            onError={(message) => {
                              setStatus("error");
                              setStatusMessage(message);
                            }}
                            onRequestNewIntent={() => {
                              if (!item) return;
                              const cacheKey = `checkout:${item.id}`;
                              const idempotencyKeyStorage = `checkout:intent:${item.id}`;
                              sessionStorage.removeItem(cacheKey);
                              sessionStorage.removeItem(idempotencyKeyStorage);
                              hasCreatedIntentRef.current = false;
                              setClientSecret(null);
                              setPaymentIntentId(null);
                              setOrderId(null);
                              setRetryCounter((prev) => prev + 1);
                              setStatus("idle");
                              setStatusMessage(null);
                            }}
                            isDisabled={!buyerEmail || isCreatingIntent}
                          />
                        </Elements>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Spinner size="sm" />
                          Preparing secure payment form...
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6 border border-gray-200/60 bg-white/90">
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <IoShieldCheckmarkOutline size={18} className="text-green-600" />
                <div>
                  <div className="font-semibold text-gray-900">Buyer protection</div>
                  <p className="mt-1">
                    Every purchase includes secure payment processing and
                    automatic receipts.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckoutForm({
  buyerEmail,
  paymentIntentId,
  onSuccess,
  onError,
  onRequestNewIntent,
  isDisabled,
}: {
  buyerEmail: string;
  paymentIntentId: string | null;
  onSuccess: () => void;
  onError: (message: string) => void;
  onRequestNewIntent: () => void;
  isDisabled: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isElementReady, setIsElementReady] = useState(false);
  const [elementLoadError, setElementLoadError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    if (!isElementReady) {
      const message = "Payment form is still loading. Please try again.";
      setErrorMessage(message);
      onError(message);
      return;
    }

    if (!buyerEmail) {
      const message = "Enter an email to continue.";
      setErrorMessage(message);
      onError(message);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (paymentIntentId) {
        await stripeApi.updatePaymentIntentEmail(paymentIntentId, buyerEmail);
      }

      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          receipt_email: buyerEmail || undefined,
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: "always",
      });

      if (result.error) {
        const message = result.error.message ?? "Payment failed. Please try again.";
        setErrorMessage(message);
        onError(message);
        setIsSubmitting(false);
        return;
      }

      if (result.paymentIntent?.status === "succeeded") {
        onSuccess();
      }
    } catch (error: any) {
      const message = error.message ?? "Payment failed. Please try again.";
      setErrorMessage(message);
      onError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        onReady={() => setIsElementReady(true)}
        onLoadError={(event) => {
          const message =
            event?.error?.message ??
            "Payment form failed to load. Check your Stripe keys and network settings.";
          setElementLoadError(message);
          setErrorMessage(message);
          onError(message);
          if (message.toLowerCase().includes("terminal state")) {
            onRequestNewIntent();
          }
        }}
      />
      {elementLoadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {elementLoadError}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        isDisabled={
          !stripe ||
          !elements ||
          !isElementReady ||
          isSubmitting ||
          isDisabled ||
          !!elementLoadError
        }
        isLoading={isSubmitting}
      >
        <IoCartOutline size={18} className="mr-2" />
        Pay now
      </Button>
    </form>
  );
}
