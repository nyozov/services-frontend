"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, Spinner, Button, Avatar } from "@heroui/react";
import {
  IoStorefront,
  IoCartOutline,
  IoShareSocialOutline,
  IoHeartOutline,
  IoLocationOutline,
  IoMailOutline,
  IoCheckmarkCircle,
  IoLogoInstagram,
  IoGlobeOutline,
  IoLogoTwitter,
  IoStarOutline,
} from "react-icons/io5";
import MessageSellerModal from "@/app/components/MessageSellerModal";
import Image from "next/image";

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  viewCount?: number;
  primaryColor?: string;
  bannerImage?: string | null;
  logoImage?: string | null;
  showBranding?: boolean;
  enableReviews?: boolean;
  showSocialLinks?: boolean;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    imageUrl?: string;
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
  const [isMessageOpen, setIsMessageOpen] = useState(false);

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

  const accentColor = useMemo(
    () => store?.primaryColor || "#3b82f6",
    [store?.primaryColor],
  );

  const heroStyle = useMemo((): CSSProperties => {
    if (!store?.bannerImage) return {};
    return {
      backgroundImage: `url(${store.bannerImage})`,
    };
  }, [store?.bannerImage]);

  const hasBanner = Boolean(store?.bannerImage);
  const heroTextClass = hasBanner ? "text-white" : "text-gray-900";
  const heroSubTextClass = hasBanner ? "text-white/80" : "text-gray-600";

  useEffect(() => {
    fetchStore();
    fetch(`${apiBase}/stores/${slug}/view`, {
      method: "POST",
      credentials: "include",
    });
  }, [slug]);

  const fetchStore = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${apiBase}/stores/${slug}`);

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
      const response = await fetch(`${apiBase}/stores/${slug}/items`);

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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: store?.name,
          text: store?.description || `Check out ${store?.name}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // You could show a toast notification here
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Hero Section with Store Header */}
      <div
        className="relative overflow-hidden border-b"
        style={{ backgroundColor: hasBanner ? undefined : "#f8fafc" }}
      >
        <div
          className={`absolute inset-0 ${hasBanner ? "bg-cover bg-center" : "bg-gradient-to-br from-white via-white to-slate-100"}`}
          style={heroStyle}
        />
        <div
          className={`absolute inset-0 ${hasBanner ? "bg-slate-950/40" : "bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_55%)]"}`}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex justify-between items-start flex-col lg:flex-row w-full gap-4">
            {/* Store Info */}
            <div className="space-y-4 w-full">
              <div className="flex items-start gap-5">
                <div
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                    hasBanner ? "bg-white/90" : "bg-white"
                  }`}
                >
                  {store.logoImage ? (
                    <img
                      src={store.logoImage}
                      alt={`${store.name} logo`}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    <IoStorefront size={36} style={{ color: accentColor }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h1
                    className={`text-4xl lg:text-5xl font-bold tracking-tight ${heroTextClass}`}
                  >
                    {store.name}
                  </h1>
                  {store.description && (
                    <p
                      className={`text-lg leading-relaxed max-w-2xl mt-2 ${heroSubTextClass}`}
                    >
                      {store.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  onPress={handleShare}
                  className="font-medium"
                  style={{ backgroundColor: accentColor }}
                >
                  <IoShareSocialOutline size={18} className="mr-2" />
                  Share Store
                </Button>
                <Button variant="secondary" className="font-medium">
                  <IoHeartOutline size={18} className="mr-2" />
                  Follow
                </Button>
              </div>

              {store.showSocialLinks && (
                <div
                  className={`flex flex-wrap gap-4 text-sm ${heroSubTextClass}`}
                >
                  {store.websiteUrl && (
                    <a
                      href={store.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 hover:opacity-80"
                    >
                      <IoGlobeOutline
                        size={18}
                        style={{ color: accentColor }}
                      />
                      Website
                    </a>
                  )}
                  {store.instagramUrl && (
                    <a
                      href={store.instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 hover:opacity-80"
                    >
                      <IoLogoInstagram
                        size={18}
                        style={{ color: accentColor }}
                      />
                      Instagram
                    </a>
                  )}
                  {store.twitterUrl && (
                    <a
                      href={store.twitterUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 hover:opacity-80"
                    >
                      <IoLogoTwitter size={18} style={{ color: accentColor }} />
                      X / Twitter
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Seller Profile Card */}
            <Card
              className={`w-full border shadow-sm ${hasBanner ? "bg-white/95 backdrop-blur" : "bg-white"}`}
            >
              <div className="p-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Seller
                </p>
                <div className="flex items-start gap-4">
                  <Avatar size="lg" className="flex-shrink-0">
                    <Avatar.Image
                      alt={store.user.name || "Store Owner"}
                      src={
                        store.user.imageUrl ||
                        "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg"
                      }
                    />
                    <Avatar.Fallback
                      className="font-semibold"
                      style={{
                        backgroundColor: `${accentColor}1A`,
                        color: accentColor,
                      }}
                    >
                      {store.user.name?.[0]?.toUpperCase() || "S"}
                    </Avatar.Fallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-lg">
                      {store.user.name || "Store Owner"}
                    </p>
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                      <IoMailOutline size={14} />
                      <span className="truncate">{store.user.email}</span>
                    </div>

                    <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Store views</span>
                        <span className="font-medium text-gray-900">
                          {store.viewCount ?? 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Listings</span>
                        <span className="font-medium text-gray-900">
                          {items.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full mt-6 font-medium"
                  style={{ backgroundColor: accentColor }}
                  onPress={() => setIsMessageOpen(true)}
                >
                  <IoMailOutline size={18} className="mr-2" />
                  Contact Seller
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Products</h2>
            <p className="text-gray-600">
              {items.length} {items.length === 1 ? "item" : "items"} available
            </p>
          </div>
        </div>

        {isLoadingItems ? (
          <div className="text-center py-20">
            <Spinner size="lg" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <IoCartOutline size={40} className="text-gray-400" />
            </div>
            <p className="text-xl font-semibold text-gray-900 mb-2">
              No products available yet
            </p>
            <p className="text-gray-600">Check back soon for new items!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <Link key={item.id} href={`/store/${slug}/product/${item.id}`}>
                <Card
                  variant="transparent"
                  className="group overflow-hidden   cursor-pointer"
                >
                  <div className="relative">
                    {item.images && item.images.length > 0 ? (
                      <div className="w-full aspect-square bg-gray-100 overflow-hidden">
                        <img
                          src={item.images[0].url}
                          alt={item.name}
                          className="w-full h-full object-cover  "
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <span className="text-gray-400 text-sm">No image</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-base text-gray-900 line-clamp-1">
                        {item.name}
                      </h3>
                    </div>

                    <p className="text-lg font-semibold text-gray-900">
                      ${Number(item.price).toFixed(2)}
                    </p>

                    {item.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer placeholder */}
      <div className="border-t bg-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">About</h3>
              <p className="text-sm text-gray-600">
                Quality products with secure checkout and fast shipping.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Support</h3>
              <p className="text-sm text-gray-600">
                Contact us for any questions or concerns.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                Trust & Safety
              </h3>
              <p className="text-sm text-gray-600">
                Secure payments powered by Stripe.
              </p>
            </div>
          </div>
          {store.showBranding !== false && (
            <div className="w-full flex items-center justify-center">
              <div className="flex justify-center mt-5 items-center">
                <span className="text text-sm text-gray-500 mr-[-20px] z-1000">Powered by</span>
                <Image
                  src="/quickshoplogo.svg"
                  alt="Quick Shop Logo"
                  width={160}
                  height={40}
                  priority
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {store?.user?.id && (
        <MessageSellerModal
          isOpen={isMessageOpen}
          onOpenChange={setIsMessageOpen}
          recipientUserId={store.user.id}
          storeName={store.name}
        />
      )}
    </div>
  );
}
