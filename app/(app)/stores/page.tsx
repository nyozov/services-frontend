"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button, Card, Spinner } from "@heroui/react";
import {
  IoAdd,
  IoStorefront,
  IoCheckmark,
  IoCopy,
  IoEllipsisHorizontal,
  IoEyeOutline,
  IoCalendarOutline,
  IoLinkOutline,
  IoSettingsOutline,
} from "react-icons/io5";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CreateStoreModal from "@/app/components/CreateStoreModal";

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  primaryColor: string;
  bannerImage: string | null;
  logoImage: string | null;
  isActive: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function StoresPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [paymentSetupNeeded, setPaymentSetupNeeded] = useState(false);
  const [isSettingUpPayments, setIsSettingUpPayments] = useState(false);

  useEffect(() => {
    fetchStores();
    checkPaymentSetup();
  }, []);

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

  const fetchStores = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();

      const response = await fetch(`${apiBase}/stores`, {
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

  const checkPaymentSetup = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${apiBase}/stripe/connect/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentSetupNeeded(!data.onboardingComplete);
      }
    } catch (err) {
      console.error("Error checking payment setup:", err);
    }
  };

  const handleEnablePayments = () => {
    setIsSettingUpPayments(true);
    router.push("/connect/onboarding");
  };

  const copyStoreUrl = (slug: string, storeId: string) => {
    const fullUrl = `${window.location.origin}/store/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(storeId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatViews = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)}w ago`;
    } else if (diffDays < 365) {
      return `${Math.floor(diffDays / 30)}mo ago`;
    }
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <Spinner size="lg" color="default" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <IoStorefront size={24} className="text-red-600" />
          </div>
          <p className="text-neutral-900 font-medium mb-2">Failed to load stores</p>
          <p className="text-sm text-neutral-500 mb-6">{error}</p>
          <Button onPress={fetchStores} variant="secondary" size="sm">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Payment Setup Banner */}
        {paymentSetupNeeded && stores.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <IoStorefront size={16} className="text-amber-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    Enable payments to start selling
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Connect your account to accept orders and get paid
                  </p>
                </div>
              </div>
              <Button
                onPress={handleEnablePayments}
                isDisabled={isSettingUpPayments}
                size="sm"
                className="bg-amber-900 text-white hover:bg-amber-800 flex-shrink-0"
              >
                {isSettingUpPayments ? "Loading..." : "Set up now"}
              </Button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
              Stores
            </h1>
            <Button
              onPress={() => setIsModalOpen(true)}
              size="sm"
              className="bg-neutral-900 text-white hover:bg-neutral-800 gap-1.5"
            >
              <IoAdd size={18} />
              New store
            </Button>
          </div>
          <p className="text-sm text-neutral-500">
            {stores.length === 0
              ? "Create your first store to start selling"
              : `${stores.length} ${stores.length === 1 ? "store" : "stores"} total`}
          </p>
        </div>

        {/* Empty State */}
        {stores.length === 0 ? (
          <div className="rounded-3xl border border-neutral-200 bg-white p-12">
            <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
                <IoStorefront size={32} className="text-neutral-400" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-2">
                No stores yet
              </h2>
              <p className="text-sm text-neutral-500 mb-6">
                Create your first store to start selling products and building your brand online
              </p>
              <Button
                onPress={() => setIsModalOpen(true)}
                className="bg-neutral-900 text-white hover:bg-neutral-800 gap-2"
              >
                <IoAdd size={18} />
                Create store
              </Button>
            </div>
          </div>
        ) : (
          /* Stores Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {stores.map((store) => (
              <div
                key={store.id}
                className="group rounded-3xl shadow-lg bg-white hover:border-neutral-300 transition-all overflow-hidden"
              >
                {/* Store Preview/Banner */}
                <div className="relative h-32 bg-gradient-to-br from-neutral-100 to-neutral-50 overflow-hidden">
                  {store.bannerImage ? (
                    <img
                      src={store.bannerImage}
                      alt={store.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{
                        background: `linear-gradient(135deg, ${store.primaryColor}15 0%, ${store.primaryColor}05 100%)`,
                      }}
                    />
                  )}
                  
                  {/* Logo */}
                  <div className="absolute bottom-0 left-4 translate-y-1/2">
                    {store.logoImage ? (
                      <div className="w-14 h-14 rounded-xl border-2 border-white bg-white overflow-hidden shadow-sm">
                        <img
                          src={store.logoImage}
                          alt={store.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-14 h-14 rounded-xl border-2 border-white shadow-sm flex items-center justify-center text-white font-semibold text-lg"
                        style={{ backgroundColor: store.primaryColor }}
                      >
                        {store.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                        store.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          store.isActive ? "bg-emerald-500" : "bg-neutral-400"
                        }`}
                      />
                      {store.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 pt-9">
                  <div className="mb-3">
                    <h3 className="text-base font-semibold text-neutral-900 mb-1 truncate">
                      {store.name}
                    </h3>
                    {store.description && (
                      <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                        {store.description}
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4 text-xs text-neutral-500">
                    <div className="flex items-center gap-1.5">
                      <IoEyeOutline size={14} />
                      <span>{formatViews(store.viewCount)} views</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <IoCalendarOutline size={14} />
                      <span>{formatDate(store.createdAt)}</span>
                    </div>
                  </div>

                  {/* URL Section */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg  border border-neutral-200 group/url hover:border-neutral-300 transition-colors">
                      <IoLinkOutline size={14} className="text-neutral-400 flex-shrink-0" />
                      <code className="text-xs text-neutral-600 truncate flex-1 font-mono">
                        /store/{store.slug}
                      </code>
                      <button
                        onClick={() => copyStoreUrl(store.slug, store.id)}
                        className="p-1 hover:bg-neutral-200 rounded transition-colors flex-shrink-0"
                      >
                        {copiedId === store.id ? (
                          <IoCheckmark size={14} className="text-emerald-600" />
                        ) : (
                          <IoCopy size={14} className="text-neutral-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/stores/${store.id}/manage`} className="flex-1">
                      <Button
                        className="w-full bg-neutral-900 text-white hover:bg-neutral-800 text-xs h-9"
                      >
                        <IoSettingsOutline size={16} />
                        Manage
                      </Button>
                    </Link>
                    <Link href={`/store/${store.slug}`}>
                      <Button
                        variant="bordered"
                        className="border-neutral-200 text-neutral-700 hover: text-xs h-9 px-3"
                      >
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
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