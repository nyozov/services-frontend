"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button, Card, Spinner } from "@heroui/react";
import { IoAdd, IoArrowBack, IoCopy, IoCheckmark } from "react-icons/io5";
import Link from "next/link";
import AddProductModal from "@/app/components/AddProductModal";
import { itemsApi } from "@/lib/services/api";

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
}

interface ItemImage {
  url: string;
  publicId: string;
  position?: number;
}

interface Item {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: ItemImage[];
  isActive: boolean;
  createdAt: string;
}

export default function ManageStorePage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const storeId = params.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchStore();
  }, [storeId]);

  useEffect(() => {
    if (store) {
      fetchItems();
    }
  }, [store]);

  const fetchStore = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();

      const response = await fetch("http://localhost:3000/api/stores", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch stores");
      }

      const stores = await response.json();
      const foundStore = stores.find((s: Store) => s.id === storeId);

      if (!foundStore) {
        throw new Error("Store not found or you don't have access");
      }

      setStore(foundStore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchItems = async () => {
    if (!store) return;

    try {
      setIsLoadingItems(true);
      const token = await getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const data = await itemsApi.getByStoreId(token, store.id);
      setItems(data);
    } catch (err) {
      console.error("Error fetching items:", err);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const copyStoreUrl = () => {
    if (!store) return;
    const fullUrl = `${window.location.origin}/store/${store.slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProductAdded = () => {
    fetchItems();
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
          <p className="text-red-600 mb-4">{error || "Store not found"}</p>
          <Link href="/stores">
            <Button>Back to Stores</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/stores">
            <Button variant="ghost" className="mb-4 gap-2">
              <IoArrowBack size={20} />
              Back to Stores
            </Button>
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {store.name}
              </h1>
              {store.description && (
                <p className="text-gray-600">{store.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  store.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {store.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          {/* Store URL */}
          <div className="mt-4 max-w-2xl">
            <p className="text-xs text-gray-500 mb-1">Store URL</p>
            <div className="flex items-center gap-2">
              <code className="text-sm text-primary bg-primary/5 px-3 py-2 rounded flex-1">
                {typeof window !== "undefined" &&
                  `${window.location.origin}/store/${store.slug}`}
              </code>
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                onPress={copyStoreUrl}
              >
                {copied ? (
                  <IoCheckmark size={16} className="text-green-600" />
                ) : (
                  <IoCopy size={16} />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Products</h2>
            <Button
              variant="primary"
              className="gap-2"
              onPress={() => setIsModalOpen(true)}
            >
              <IoAdd size={20} />
              Add Product
            </Button>
          </div>

          {isLoadingItems ? (
            <div className="text-center py-12">
              <Spinner size="lg" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No products yet</p>
              <p className="text-sm text-gray-500 mb-6">
                Add your first product to start selling
              </p>
              <Button
                variant="primary"
                className="gap-2"
                onPress={() => setIsModalOpen(true)}
              >
                <IoAdd size={20} />
                Add Your First Product
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  {item.images.length > 0 && item.images[0]?.url ? (
                    <div className="w-full h-48 bg-gray-200">
                      <img
                        src={item.images[0].url}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400">No image</span>
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {item.name}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <p className="text-2xl font-bold text-primary mb-4">
                      ${Number(item.price).toFixed(2)}
                    </p>

                    <div className="flex gap-2">
                      <Button variant="secondary" className="flex-1" size="sm">
                        Edit
                      </Button>
                      <Button variant="ghost" className="flex-1" size="sm">
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        storeId={store.id}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onProductAdded={handleProductAdded}
      />
    </div>
  );
}
