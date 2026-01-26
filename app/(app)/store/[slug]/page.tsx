"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, Spinner, Button } from "@heroui/react";
import { IoStorefront, IoCartOutline } from "react-icons/io5";
import CheckoutModal from "@/app/components/CheckoutModal";

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  user: {
    name: string | null;
    email: string;
  };
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
  createdAt: string;
}

export default function PublicStorePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [store, setStore] = useState<Store | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Checkout modal state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  useEffect(() => {
    fetchStore();
  }, [slug]);

  const fetchStore = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:3000/api/stores/${slug}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Store not found");
        }
        throw new Error("Failed to load store");
      }

      const data = await response.json();
      setStore(data);

      if (data && data.isActive) {
        fetchItems();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      setIsLoadingItems(true);
      const response = await fetch(
        `http://localhost:3000/api/stores/${slug}/items`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }

      const data = await response.json();
      setItems(data);
    } catch (err) {
      console.error("Error fetching items:", err);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleBuyClick = (item: Item) => {
    setSelectedItem(item);
    setIsCheckoutOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <IoStorefront size={40} className="text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || "Store not found"}
          </h1>
          <p className="text-gray-600">
            This store doesn't exist or has been removed
          </p>
        </div>
      </div>
    );
  }

  if (!store.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Store Temporarily Unavailable
          </h1>
          <p className="text-gray-600">This store is currently inactive</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Store Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
              <IoStorefront size={32} className="text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">{store.name}</h1>
              {store.user.name && (
                <p className="text-gray-600 mt-1">by {store.user.name}</p>
              )}
            </div>
          </div>

          {store.description && (
            <p className="text-lg text-gray-700 max-w-3xl">
              {store.description}
            </p>
          )}
        </div>
      </div>

      {/* Products Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Products</h2>

        {isLoadingItems ? (
          <div className="text-center py-20">
            <Spinner size="lg" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-600 mb-4">No products available yet</p>
            <p className="text-sm text-gray-500">
              Check back soon for new items!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-xl transition-shadow">
                {item.images && item.images.length > 0 ? (
                  <div className="w-full h-56 bg-gray-200">
                    <img
                      src={item.images[0].url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-56 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">No image</span>
                  </div>
                )}

                <div className="p-5">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {item.name}
                  </h3>

                  {item.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {item.description}
                    </p>
                  )}

                  <p className="text-3xl font-bold text-primary mb-4">
                    ${Number(item.price).toFixed(2)}
                  </p>

                  <Button
                    variant="primary"
                    className="w-full gap-2"
                    size="lg"
                    onPress={() => handleBuyClick(item)}
                  >
                    <IoCartOutline size={20} />
                    Buy Now
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {selectedItem && (
        <CheckoutModal
          itemId={selectedItem.id}
          itemName={selectedItem.name}
          itemPrice={Number(selectedItem.price)}
          isOpen={isCheckoutOpen}
          onOpenChange={setIsCheckoutOpen}
        />
      )}
    </div>
  );
}