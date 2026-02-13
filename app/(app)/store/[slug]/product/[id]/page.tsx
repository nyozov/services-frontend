"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Spinner } from "@heroui/react";
import {
  IoArrowBack,
  IoCheckmarkCircleOutline,
  IoLockClosedOutline,
  IoShieldCheckmarkOutline,
} from "react-icons/io5";
import {
  AddressElement,
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
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
  const [buyerName, setBuyerName] = useState("");
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
    const fullName = user.fullName;
    if (email && !buyerEmail) {
      setBuyerEmail(email);
    }
    if (fullName && !buyerName) {
      setBuyerName(fullName);
    }
  }, [isLoaded, user, buyerEmail, buyerName]);

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

  const isFormComplete = () => {
    return buyerEmail;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Spinner size="lg" color="default" />
      </div>
    );
  }

  if (!store || !item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center max-w-md">
          <h2 className="text-lg font-semibold text-neutral-900 mb-2">
            Product not found
          </h2>
          <Link href={`/store/${slug}`}>
            <Button variant="bordered" size="sm" className="mt-4">
              Back to store
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const activeImage = sortedImages[imageIndex]?.url || sortedImages[0]?.url || "";
  const platformFee = Number(item.price) * 0.05;
  const total = Number(item.price);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link
            href={`/store/${slug}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <IoArrowBack size={16} />
            Back to {store.name}
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Product Info */}
          <div className="space-y-6">
            {/* Product Images */}
            <div className="rounded-2xl overflow-hidden bg-white border border-neutral-200">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={item.name}
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center bg-neutral-100 text-neutral-400">
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
                    className={`rounded-xl overflow-hidden border-2 transition-all ${
                      index === imageIndex
                        ? "border-neutral-900"
                        : "border-neutral-200 hover:border-neutral-300"
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

            {/* Product Details */}
            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <h1 className="text-xl font-semibold text-neutral-900 mb-2">
                {item.name}
              </h1>
              {item.description && (
                <p className="text-sm text-neutral-600 leading-relaxed">
                  {item.description}
                </p>
              )}
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-neutral-900">
                    ${Number(item.price).toFixed(2)}
                  </span>
                  <span className="text-sm text-neutral-500">USD</span>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <IoShieldCheckmarkOutline size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Secure payments</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      SSL encrypted checkout powered by Stripe
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <IoLockClosedOutline size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Buyer protection</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Every purchase includes automatic receipts
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Checkout Form */}
          <div className="lg:sticky lg:top-24 h-fit">
            {status === "success" ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <IoCheckmarkCircleOutline size={28} className="text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-900">
                      Order confirmed
                    </h3>
                    <p className="text-sm text-emerald-700">Payment successful</p>
                  </div>
                </div>
                <div className="rounded-lg bg-white p-4 border border-emerald-200">
                  <p className="text-sm text-neutral-700 mb-2">
                    {statusMessage ?? "Your order has been confirmed."}
                  </p>
                  {orderId && (
                    <p className="text-xs text-neutral-500 font-mono">
                      Order ID: {orderId}
                    </p>
                  )}
                </div>
                <Link href={`/store/${slug}`} className="block mt-4">
                  <Button variant="bordered" size="sm" className="w-full">
                    Continue shopping
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 mb-1">
                    Checkout
                  </h2>
                  <p className="text-sm text-neutral-500">
                    Complete your purchase securely
                  </p>
                </div>

                {!stripePromise && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-700">
                      Stripe publishable key is missing. Set{" "}
                      <span className="font-semibold">
                        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
                      </span>{" "}
                      to enable payments.
                    </p>
                  </div>
                )}

                {status === "error" && statusMessage && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-700">{statusMessage}</p>
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-900 mb-3">
                      Contact email
                    </h3>
                    <Input
                      type="email"
                      label="Email"
                      placeholder="you@example.com"
                      value={buyerEmail}
                      onChange={(event) => setBuyerEmail(event.target.value)}
                      isReadOnly={!!user}
                      className="text-sm"
                    />
                    <p className="mt-2 text-xs text-neutral-500">
                      We’ll send your receipt and updates to this email.
                    </p>
                  </div>

                  <div className="border-t border-neutral-100 pt-4">
                    <h3 className="text-sm font-medium text-neutral-900 mb-3">
                      Shipping & payment
                    </h3>
                    {clientSecret && stripePromise ? (
                      <Elements stripe={stripePromise} options={{ clientSecret }}>
                        <CheckoutForm
                          buyerEmail={buyerEmail}
                          buyerName={buyerName}
                          paymentIntentId={paymentIntentId}
                          itemPrice={Number(item.price)}
                          onSuccess={() => {
                            setStatus("success");
                            setStatusMessage(
                              "Payment successful! Your order has been confirmed."
                            );
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
                          isDisabled={!isFormComplete() || isCreatingIntent}
                        />
                      </Elements>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-neutral-500 py-4">
                        <Spinner size="sm" />
                        Preparing secure payment...
                      </div>
                    )}
                  </div>

                  {!isFormComplete() && (
                    <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4">
                      <p className="text-sm text-neutral-600">
                        Add your email to continue to payment
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckoutForm({
  buyerEmail,
  buyerName,
  paymentIntentId,
  itemPrice,
  onSuccess,
  onError,
  onRequestNewIntent,
  isDisabled,
}: {
  buyerEmail: string;
  buyerName: string;
  paymentIntentId: string | null;
  itemPrice: number;
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
  const [addressComplete, setAddressComplete] = useState(false);
  const [addressValue, setAddressValue] = useState<{
    name?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  } | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    if (!isElementReady) {
      const message = "Payment form is still loading. Please try again.";
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
          shipping: {
            name: addressValue?.name || buyerName,
            address: {
              line1: addressValue?.address?.line1,
              line2: addressValue?.address?.line2 || undefined,
              city: addressValue?.address?.city,
              state: addressValue?.address?.state,
              postal_code: addressValue?.address?.postal_code,
              country: addressValue?.address?.country,
            },
          },
        },
        redirect: "always",
      });

      if (result.error) {
        const message =
          result.error.message ?? "Payment failed. Please try again.";
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

  const platformFee = itemPrice * 0.05;
  const total = itemPrice;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="mb-3 text-sm font-medium text-neutral-900">
          Shipping address
        </div>
        <div className="rounded-lg border border-neutral-200 p-3">
          <AddressElement
            options={{
              mode: "shipping",
              allowedCountries: ["US", "CA", "GB", "AU"],
            }}
            onChange={(event) => {
              setAddressComplete(event.complete);
              if (event.value) {
                setAddressValue({
                  name: event.value.name || buyerName,
                  address: event.value.address,
                });
              }
            }}
          />
        </div>
      </div>
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

      {/* Order Summary */}
      <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-600">Subtotal</span>
          <span className="font-medium text-neutral-900">
            ${itemPrice.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-600">Shipping</span>
          <span className="font-medium text-neutral-900">Free</span>
        </div>
        <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-900">Total</span>
          <span className="text-lg font-semibold text-neutral-900">
            ${total.toFixed(2)}
          </span>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full bg-neutral-900 text-white hover:bg-neutral-800"
        isDisabled={
          !stripe ||
          !elements ||
          !isElementReady ||
          isSubmitting ||
          isDisabled ||
          !!elementLoadError ||
          !addressComplete
        }
        isLoading={isSubmitting}
      >
        {isSubmitting ? "Processing..." : `Pay $${total.toFixed(2)}`}
      </Button>

      <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
        <IoLockClosedOutline size={12} />
        <span>Secured by Stripe</span>
      </div>
    </form>
  );
}
