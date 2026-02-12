"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, Spinner } from "@heroui/react";
import {
  IoArrowBack,
  IoCartOutline,
  IoHeartOutline,
  IoStarOutline,
} from "react-icons/io5";
import CheckoutModal from "@/app/components/CheckoutModal";

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

export default function ProductPage() {
  const params = useParams();
  const slug = params.slug as string;
  const productId = params.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

  useEffect(() => {
    fetchData();
  }, [slug, productId]);

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

  const accentColor = store.primaryColor || "#3b82f6";
  const activeImage =
    sortedImages[imageIndex]?.url || sortedImages[0]?.url || "";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href={`/store/${slug}`} className="inline-flex items-center gap-2 text-sm text-gray-600">
          <IoArrowBack size={16} />
          Back to {store.name}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-6">
          <div className="space-y-4">
            <div className="rounded-3xl overflow-hidden bg-white border">
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
          </div>

          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">
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

            <div className="text-3xl font-semibold text-gray-900">
              ${Number(item.price).toFixed(2)}
              <span className="text-sm text-gray-500 font-normal"> / item</span>
            </div>

            {item.description && (
              <p className="text-sm text-gray-600 leading-relaxed">
                {item.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
              <div className="rounded-xl border border-gray-200 p-3">
                Ships in 2-4 days
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                Free returns
              </div>
            </div>

            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                style={{ backgroundColor: accentColor }}
                onPress={() => setIsCheckoutOpen(true)}
              >
                <IoCartOutline size={20} className="mr-2" />
                Buy Now
              </Button>
              <p className="text-xs text-gray-500">
                Secure checkout powered by Stripe.
              </p>
            </div>
          </div>
        </div>
      </div>

      {isCheckoutOpen && (
        <CheckoutModal
          itemId={item.id}
          itemName={item.name}
          itemPrice={Number(item.price)}
          isOpen={isCheckoutOpen}
          onOpenChange={setIsCheckoutOpen}
        />
      )}
    </div>
  );
}
