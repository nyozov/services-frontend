"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button, Card, Spinner } from "@heroui/react";
import {
  IoAdd,
  IoStorefront,
  IoCheckmark,
  IoCopy,
} from "react-icons/io5";
import Link from "next/link";
import CreateStoreModal from "@/app/components/CreateStoreModal";

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function StoresPage() {
  const { getToken } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
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

      const data = await response.json();
      setStores(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const copyStoreUrl = (slug: string, storeId: string) => {
    const fullUrl = `${window.location.origin}/store/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(storeId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onPress={fetchStores}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Stores</h1>
            <p className="text-gray-600">
              Manage your online storefronts and products
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            className="gap-2"
            onPress={() => setIsModalOpen(true)}
          >
            <IoAdd size={20} />
            Create Store
          </Button>
        </div>

        {/* Empty State */}
        {stores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-6">
              <IoStorefront size={40} className="text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No stores yet
            </h2>
            <p className="text-gray-600 mb-8 text-center max-w-md">
              Create your first store to start selling your products and
              services online
            </p>
            <Button
              variant="primary"
              size="lg"
              className="gap-2"
              onPress={() => setIsModalOpen(true)}
            >
              <IoAdd size={20} />
              Create Your First Store
            </Button>
          </div>
        ) : (
          /* Stores Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
              <Card
                key={store.id}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <IoStorefront size={24} className="text-primary" />
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      store.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {store.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {store.name}
                </h3>

                {store.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {store.description}
                  </p>
                )}

                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">Store URL</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-primary bg-primary/5 px-2 py-1 rounded flex-1 truncate">
                      {window.location.origin}/store/{store.slug}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      onPress={() => copyStoreUrl(store.slug, store.id)}
                    >
                      {copiedId === store.id ? (
                        <IoCheckmark size={16} className="text-green-600" />
                      ) : (
                        <IoCopy size={16} />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link href={`/stores/${store.id}/manage`} className="flex-1">
                    <Button variant="secondary" className="w-full">
                      Manage
                    </Button>
                  </Link>
                  <Link href={`/store/${store.slug}`} className="flex-1">
                    <Button variant="ghost" className="w-full">
                      View Store
                    </Button>
                  </Link>
                </div>

                <p className="text-xs text-gray-400 mt-4">
                  Created {new Date(store.createdAt).toLocaleDateString()}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Store Modal */}
      <CreateStoreModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onStoreCreated={fetchStores}
      />
    </div>
  );
}
