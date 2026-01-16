"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, Spinner } from "@heroui/react";
import { IoStorefront } from "react-icons/io5";

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

export default function PublicStorePage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
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
          <p className="text-gray-600">
            This store is currently inactive
          </p>
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
              <h1 className="text-4xl font-bold text-gray-900">
                {store.name}
              </h1>
              {store.user.name && (
                <p className="text-gray-600 mt-1">
                  by {store.user.name}
                </p>
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
        
        {/* Empty state - you'll replace this when you add Items */}
        <div className="text-center py-20">
          <p className="text-gray-600 mb-4">
            No products available yet
          </p>
          <p className="text-sm text-gray-500">
            Check back soon for new items!
          </p>
        </div>

        {/* TODO: Add product grid here when you create Items */}
      </div>
    </div>
  );
}