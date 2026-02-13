"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Button,
  Card,
  Spinner,
  Switch,
  Label,
  Tabs,
  Input,
  TextArea,
} from "@heroui/react";
import {
  IoAdd,
  IoArrowBack,
  IoCopy,
  IoCheckmark,
  IoColorPaletteOutline,
  IoImageOutline,
  IoSettingsOutline,
  IoGridOutline,
  IoEyeOutline,
  IoTrashOutline,
  IoCreateOutline,
  IoLinkOutline,
  IoGlobeOutline,
  IoLogoInstagram,
  IoLogoTwitter,
} from "react-icons/io5";
import Link from "next/link";
import AddProductModal from "@/app/components/AddProductModal";
import { itemsApi, storesApi } from "@/lib/services/api";

const DEFAULT_PRIMARY = "#3b82f6";

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  primaryColor?: string;
  bannerImage?: string | null;
  logoImage?: string | null;
  showBranding?: boolean;
  enableReviews?: boolean;
  showSocialLinks?: boolean;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  isActive: boolean;
  viewCount: number;
}

interface Item {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: Array<{ url: string; publicId: string; position?: number }>;
  isActive: boolean;
  createdAt: string;
}

export default function ManageStorePage() {
  const params = useParams();
  const { getToken } = useAuth();
  const storeId = params.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("products");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [storeInfo, setStoreInfo] = useState({
    name: "",
    description: "",
  });

  const [storeSettings, setStoreSettings] = useState({
    primaryColor: DEFAULT_PRIMARY,
    showBranding: true,
    enableReviews: false,
    showSocialLinks: false,
    bannerImage: null as string | null,
    logoImage: null as string | null,
    websiteUrl: "",
    instagramUrl: "",
    twitterUrl: "",
  });

  useEffect(() => {
    fetchStore();
  }, [storeId]);

  useEffect(() => {
    if (store) {
      fetchItems();
    }
  }, [store]);

  useEffect(() => {
    if (!store) return;
    setStoreSettings({
      primaryColor: store.primaryColor || DEFAULT_PRIMARY,
      bannerImage: store.bannerImage ?? null,
      logoImage: store.logoImage ?? null,
      showBranding: store.showBranding ?? true,
      enableReviews: store.enableReviews ?? false,
      showSocialLinks: store.showSocialLinks ?? false,
      websiteUrl: store.websiteUrl ?? "",
      instagramUrl: store.instagramUrl ?? "",
      twitterUrl: store.twitterUrl ?? "",
    });
    setStoreInfo({
      name: store.name || "",
      description: store.description ?? "",
    });
  }, [store]);

  const fetchStore = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const stores = await storesApi.getAll(token);
      const foundStore = stores.find((s: Store) => s.id === storeId);
      if (!foundStore) throw new Error("Store not found");
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
      if (!token) throw new Error("Not authenticated");
      const data = await itemsApi.getByStoreId(token, store.id);
      setItems(data);
    } catch (err) {
      console.error("Error fetching items:", err);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!,
    );

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!res.ok) {
      throw new Error("Image upload failed");
    }

    return res.json();
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setIsUploadingLogo(true);
    setUploadError(null);
    try {
      const uploaded = await uploadToCloudinary(logoFile);
      setStoreSettings((prev) => ({
        ...prev,
        logoImage: uploaded.secure_url,
      }));
      setLogoPreview(null);
      setLogoFile(null);
      setSaveMessage("Logo uploaded");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleBannerUpload = async () => {
    if (!bannerFile) return;
    setIsUploadingBanner(true);
    setUploadError(null);
    try {
      const uploaded = await uploadToCloudinary(bannerFile);
      setStoreSettings((prev) => ({
        ...prev,
        bannerImage: uploaded.secure_url,
      }));
      setBannerPreview(null);
      setBannerFile(null);
      setSaveMessage("Banner uploaded");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Banner upload failed",
      );
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const persistStoreUpdate = async (
    payload: Record<string, unknown>,
    message: string,
  ) => {
    if (!store) return;
    try {
      setIsSaving(true);
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const updated = await storesApi.update(token, store.id, payload);
      setStore(updated);
      setSaveMessage(message);
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      setSaveMessage(
        err instanceof Error ? err.message : "Failed to save changes",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDesign = async () => {
    await persistStoreUpdate(
      {
        primaryColor: storeSettings.primaryColor,
        bannerImage: storeSettings.bannerImage || null,
        logoImage: storeSettings.logoImage || null,
        showBranding: storeSettings.showBranding,
        enableReviews: storeSettings.enableReviews,
        showSocialLinks: storeSettings.showSocialLinks,
        websiteUrl: storeSettings.websiteUrl || null,
        instagramUrl: storeSettings.instagramUrl || null,
        twitterUrl: storeSettings.twitterUrl || null,
      },
      "Design updated",
    );
  };

  const handleSaveInfo = async () => {
    await persistStoreUpdate(
      {
        name: storeInfo.name.trim(),
        description: storeInfo.description.trim() || null,
      },
      "Store info updated",
    );
  };

  const handleStatusChange = async (nextStatus: boolean) => {
    if (!store || store.isActive === nextStatus) return;
    await persistStoreUpdate({ isActive: nextStatus }, "Store status updated");
  };

  const copyStoreUrl = () => {
    if (!store) return;
    const fullUrl = `${window.location.origin}/store/${store.slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatViews = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Spinner size="lg" color="default" />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <IoGridOutline size={24} className="text-red-600" />
          </div>
          <p className="text-neutral-900 font-medium mb-2">Store not found</p>
          <p className="text-sm text-neutral-500 mb-6">{error || "Unable to load store"}</p>
          <Link href="/stores">
            <Button variant="secondary" size="sm">Back to Stores</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/stores">
                <button className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center transition-colors">
                  <IoArrowBack size={18} className="text-neutral-600" />
                </button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-neutral-900 tracking-tight">
                  {store.name}
                </h1>
                <p className="text-xs text-neutral-500">Manage store</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {saveMessage && (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                    <IoCheckmark size={14} />
                    {saveMessage}
                  </p>
                </div>
              )}
              <Link href={`/store/${store.slug}`} target="_blank">
                <Button variant="bordered" size="sm" className="gap-1.5 border-neutral-200 text-neutral-700 hover:bg-neutral-50">
                  <IoEyeOutline size={16} />
                  Preview
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Stats & Quick Actions */}
          <div className="lg:col-span-1 space-y-4">
            {/* Store Link Card */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">Store link</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-neutral-50 border border-neutral-200">
                  <IoLinkOutline size={14} className="text-neutral-400 flex-shrink-0" />
                  <code className="text-xs text-neutral-600 truncate flex-1 font-mono">
                    /store/{store.slug}
                  </code>
                  <button
                    onClick={copyStoreUrl}
                    className="p-1 hover:bg-neutral-200 rounded transition-colors flex-shrink-0"
                  >
                    {copied ? (
                      <IoCheckmark size={14} className="text-emerald-600" />
                    ) : (
                      <IoCopy size={14} className="text-neutral-500" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-neutral-900 mb-4">Overview</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Total products</p>
                  <p className="text-2xl font-semibold text-neutral-900">{items.length}</p>
                </div>
                <div className="pt-4 border-t border-neutral-100">
                  <p className="text-xs text-neutral-500 mb-1">Active products</p>
                  <p className="text-2xl font-semibold text-neutral-900">
                    {items.filter((i) => i.isActive).length}
                  </p>
                </div>
                <div className="pt-4 border-t border-neutral-100">
                  <p className="text-xs text-neutral-500 mb-1">Total views</p>
                  <p className="text-2xl font-semibold text-neutral-900">
                    {formatViews(store.viewCount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Card */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">Store status</h3>
              <div className="space-y-3">
                <div
                  className={`px-3 py-2 rounded-lg border ${
                    store.isActive
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-neutral-100 border-neutral-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        store.isActive ? "bg-emerald-500" : "bg-neutral-400"
                      }`}
                    />
                    <span className={`text-sm font-medium ${
                      store.isActive ? "text-emerald-900" : "text-neutral-700"
                    }`}>
                      {store.isActive ? "Live" : "Inactive"}
                    </span>
                  </div>
                  <p className={`text-xs ${
                    store.isActive ? "text-emerald-700" : "text-neutral-500"
                  }`}>
                    {store.isActive
                      ? "Visible to customers"
                      : "Hidden from customers"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={(key) => setActiveTab(key as string)}
              className="w-full"
            >
              {/* Tab Navigation */}
              <div className="mb-6">
                <Tabs.List className="inline-flex p-1 bg-neutral-100 rounded-lg">
                  <Tabs.Tab 
                    id="products" 
                    className="px-4 py-2 text-sm font-medium rounded-md transition-colors data-[selected]:bg-white data-[selected]:text-neutral-900 data-[selected]:shadow-sm text-neutral-600 hover:text-neutral-900"
                  >
                    <IoGridOutline size={16} className="mr-2" />
                    Products
                  </Tabs.Tab>
                  <Tabs.Tab 
                    id="design"
                    className="px-4 py-2 text-sm font-medium rounded-md transition-colors data-[selected]:bg-white data-[selected]:text-neutral-900 data-[selected]:shadow-sm text-neutral-600 hover:text-neutral-900"
                  >
                    <IoColorPaletteOutline size={16} className="mr-2" />
                    Design
                  </Tabs.Tab>
                  <Tabs.Tab 
                    id="settings"
                    className="px-4 py-2 text-sm font-medium rounded-md transition-colors data-[selected]:bg-white data-[selected]:text-neutral-900 data-[selected]:shadow-sm text-neutral-600 hover:text-neutral-900"
                  >
                    <IoSettingsOutline size={16} className="mr-2" />
                    Settings
                  </Tabs.Tab>
                </Tabs.List>
              </div>

              {/* Products Tab */}
              <Tabs.Panel id="products">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-neutral-900">Products</h2>
                      <p className="text-sm text-neutral-500">
                        {items.length === 0 ? "No products yet" : `${items.length} total`}
                      </p>
                    </div>
                    <Button
                      className="bg-neutral-900 text-white hover:bg-neutral-800 gap-1.5"
                      size="sm"
                      onPress={() => setIsModalOpen(true)}
                    >
                      <IoAdd size={18} />
                      Add product
                    </Button>
                  </div>

                  {isLoadingItems ? (
                    <div className="rounded-xl border border-neutral-200 bg-white p-12">
                      <div className="flex justify-center">
                        <Spinner size="lg" color="default" />
                      </div>
                    </div>
                  ) : items.length === 0 ? (
                    <div className="rounded-xl border border-neutral-200 bg-white p-12">
                      <div className="text-center max-w-md mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                          <IoGridOutline size={32} className="text-neutral-400" />
                        </div>
                        <h3 className="text-base font-semibold text-neutral-900 mb-2">No products yet</h3>
                        <p className="text-sm text-neutral-500 mb-6">
                          Add your first product to start selling
                        </p>
                        <Button
                          className="bg-neutral-900 text-white hover:bg-neutral-800 gap-2"
                          onPress={() => setIsModalOpen(true)}
                        >
                          <IoAdd size={18} />
                          Add product
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="group rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 transition-all overflow-hidden"
                        >
                          {/* Product Image */}
                          <div className="relative aspect-square bg-neutral-100">
                            {item.images.length > 0 && item.images[0]?.url ? (
                              <img
                                src={item.images[0].url}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <IoImageOutline size={48} className="text-neutral-300" />
                              </div>
                            )}
                            <div className="absolute top-3 right-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                                  item.isActive
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    item.isActive ? "bg-emerald-500" : "bg-neutral-400"
                                  }`}
                                />
                                {item.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>

                          {/* Product Info */}
                          <div className="p-4">
                            <h3 className="font-semibold text-neutral-900 mb-1 truncate">
                              {item.name}
                            </h3>
                            {item.description && (
                              <p className="text-xs text-neutral-500 line-clamp-2 mb-3 leading-relaxed">
                                {item.description}
                              </p>
                            )}
                            <p className="text-lg font-semibold text-neutral-900 mb-4">
                              ${Number(item.price).toFixed(2)}
                            </p>

                            <div className="flex gap-2">
                              <Button
                                variant="bordered"
                                size="sm"
                                className="flex-1 border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                              >
                                <IoCreateOutline size={16} />
                                Edit
                              </Button>
                              <Button
                                variant="bordered"
                                size="sm"
                                className="border-neutral-200 text-neutral-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                              >
                                <IoTrashOutline size={16} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Tabs.Panel>

              {/* Design Tab */}
              <Tabs.Panel id="design">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900 mb-1">Design</h2>
                    <p className="text-sm text-neutral-500">
                      Customize your store's appearance
                    </p>
                  </div>

                  {/* Brand Assets */}
                  <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-neutral-900">Brand assets</h3>
                      <div
                        className="w-8 h-8 rounded-lg border border-neutral-200"
                        style={{ backgroundColor: storeSettings.primaryColor }}
                      />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Logo Upload */}
                      <div className="space-y-3">
                        <Label className="text-xs font-medium text-neutral-700 uppercase tracking-wide">
                          Logo
                        </Label>
                        <div className="space-y-3">
                          <div className="w-24 h-24 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center overflow-hidden">
                            {logoPreview || storeSettings.logoImage ? (
                              <img
                                src={logoPreview || storeSettings.logoImage || ""}
                                alt="Store logo"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <IoImageOutline size={32} className="text-neutral-300" />
                            )}
                          </div>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              setLogoFile(file);
                              setLogoPreview(URL.createObjectURL(file));
                            }}
                            className="text-xs"
                          />
                          <Button
                            variant="bordered"
                            size="sm"
                            onPress={handleLogoUpload}
                            isDisabled={!logoFile || isUploadingLogo}
                            className="w-full border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                          >
                            {isUploadingLogo ? "Uploading..." : "Upload logo"}
                          </Button>
                          <p className="text-xs text-neutral-500">
                            Square image recommended
                          </p>
                        </div>
                      </div>

                      {/* Banner Upload */}
                      <div className="space-y-3">
                        <Label className="text-xs font-medium text-neutral-700 uppercase tracking-wide">
                          Banner
                        </Label>
                        <div className="space-y-3">
                          <div className="aspect-[2/1] rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 flex items-center justify-center">
                            {bannerPreview || storeSettings.bannerImage ? (
                              <img
                                src={bannerPreview || storeSettings.bannerImage || ""}
                                alt="Store banner"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <IoImageOutline size={32} className="text-neutral-300" />
                            )}
                          </div>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              setBannerFile(file);
                              setBannerPreview(URL.createObjectURL(file));
                            }}
                            className="text-xs"
                          />
                          <Button
                            variant="bordered"
                            size="sm"
                            onPress={handleBannerUpload}
                            isDisabled={!bannerFile || isUploadingBanner}
                            className="w-full border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                          >
                            {isUploadingBanner ? "Uploading..." : "Upload banner"}
                          </Button>
                          <p className="text-xs text-neutral-500">
                            16:9 aspect ratio recommended
                          </p>
                        </div>
                      </div>
                    </div>

                    {uploadError && (
                      <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                        <p className="text-xs text-red-700">{uploadError}</p>
                      </div>
                    )}

                    {/* Theme Color */}
                    <div className="space-y-3 pt-6 border-t border-neutral-100">
                      <Label className="text-xs font-medium text-neutral-700 uppercase tracking-wide">
                        Theme color
                      </Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={storeSettings.primaryColor}
                          onChange={(event) =>
                            setStoreSettings((prev) => ({
                              ...prev,
                              primaryColor: event.target.value,
                            }))
                          }
                          className="h-10 w-10 rounded-lg border border-neutral-200 cursor-pointer"
                        />
                        <Input
                          value={storeSettings.primaryColor}
                          onChange={(event) =>
                            setStoreSettings((prev) => ({
                              ...prev,
                              primaryColor: event.target.value,
                            }))
                          }
                          className="flex-1 max-w-xs font-mono text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        {["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"].map((color) => (
                          <button
                            key={color}
                            onClick={() =>
                              setStoreSettings((prev) => ({
                                ...prev,
                                primaryColor: color,
                              }))
                            }
                            className={`w-10 h-10 rounded-lg border-2 transition-all ${
                              storeSettings.primaryColor === color
                                ? "border-neutral-900 scale-110"
                                : "border-neutral-200 hover:scale-105"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-neutral-100">
                      <Button
                        className="bg-neutral-900 text-white hover:bg-neutral-800"
                        size="sm"
                        onPress={handleSaveDesign}
                        isDisabled={isSaving}
                      >
                        {isSaving ? "Saving..." : "Save design"}
                      </Button>
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-900">Social links</h3>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Display on your storefront
                        </p>
                      </div>
                      <Switch
                        isSelected={storeSettings.showSocialLinks}
                        onChange={(checked) =>
                          setStoreSettings((prev) => ({
                            ...prev,
                            showSocialLinks: checked,
                          }))
                        }
                      >
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </div>

                    {storeSettings.showSocialLinks && (
                      <div className="grid gap-4 pt-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-neutral-700 uppercase tracking-wide flex items-center gap-1.5">
                            <IoGlobeOutline size={14} />
                            Website
                          </Label>
                          <Input
                            value={storeSettings.websiteUrl}
                            onChange={(event) =>
                              setStoreSettings((prev) => ({
                                ...prev,
                                websiteUrl: event.target.value,
                              }))
                            }
                            placeholder="https://yourdomain.com"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-neutral-700 uppercase tracking-wide flex items-center gap-1.5">
                            <IoLogoInstagram size={14} />
                            Instagram
                          </Label>
                          <Input
                            value={storeSettings.instagramUrl}
                            onChange={(event) =>
                              setStoreSettings((prev) => ({
                                ...prev,
                                instagramUrl: event.target.value,
                              }))
                            }
                            placeholder="https://instagram.com/yourstore"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-neutral-700 uppercase tracking-wide flex items-center gap-1.5">
                            <IoLogoTwitter size={14} />
                            Twitter / X
                          </Label>
                          <Input
                            value={storeSettings.twitterUrl}
                            onChange={(event) =>
                              setStoreSettings((prev) => ({
                                ...prev,
                                twitterUrl: event.target.value,
                              }))
                            }
                            placeholder="https://x.com/yourstore"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Tabs.Panel>

              {/* Settings Tab */}
              <Tabs.Panel id="settings">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900 mb-1">Settings</h2>
                    <p className="text-sm text-neutral-500">
                      Configure your store preferences
                    </p>
                  </div>

                  {/* Store Info */}
                  <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
                    <h3 className="text-sm font-semibold text-neutral-900">Store information</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-neutral-700 uppercase tracking-wide">
                          Store name
                        </Label>
                        <Input
                          value={storeInfo.name}
                          onChange={(event) =>
                            setStoreInfo((prev) => ({
                              ...prev,
                              name: event.target.value,
                            }))
                          }
                          placeholder="Your store name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-neutral-700 uppercase tracking-wide">
                          Description
                        </Label>
                        <TextArea
                          value={storeInfo.description}
                          onChange={(event) =>
                            setStoreInfo((prev) => ({
                              ...prev,
                              description: event.target.value,
                            }))
                          }
                          placeholder="Tell customers about your brand"
                          rows={4}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-neutral-100">
                      <Button
                        className="bg-neutral-900 text-white hover:bg-neutral-800"
                        size="sm"
                        onPress={handleSaveInfo}
                        isDisabled={isSaving}
                      >
                        {isSaving ? "Saving..." : "Save info"}
                      </Button>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-6">
                    <h3 className="text-sm font-semibold text-neutral-900">Features</h3>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-neutral-900">Platform branding</p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Show "Powered by" in footer
                        </p>
                      </div>
                      <Switch
                        isSelected={storeSettings.showBranding}
                        onChange={(checked) =>
                          setStoreSettings((prev) => ({
                            ...prev,
                            showBranding: checked,
                          }))
                        }
                      >
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-neutral-100">
                      <div>
                        <p className="text-sm font-medium text-neutral-900">Product reviews</p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Allow customer reviews
                        </p>
                      </div>
                      <Switch
                        isSelected={storeSettings.enableReviews}
                        onChange={(checked) =>
                          setStoreSettings((prev) => ({
                            ...prev,
                            enableReviews: checked,
                          }))
                        }
                      >
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </div>

                    <div className="pt-6 border-t border-neutral-100">
                      <Label className="text-sm font-medium text-neutral-900 mb-3 block">
                        Visibility
                      </Label>
                      <div className="flex gap-3">
                        <Button
                          variant={store.isActive ? "primary" : "bordered"}
                          size="sm"
                          onPress={() => handleStatusChange(true)}
                          className={
                            store.isActive
                              ? "bg-neutral-900 text-white"
                              : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                          }
                        >
                          Active
                        </Button>
                        <Button
                          variant={!store.isActive ? "primary" : "bordered"}
                          size="sm"
                          onPress={() => handleStatusChange(false)}
                          className={
                            !store.isActive
                              ? "bg-neutral-900 text-white"
                              : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                          }
                        >
                          Inactive
                        </Button>
                      </div>
                      <p className="text-xs text-neutral-500 mt-3">
                        {store.isActive
                          ? "Your store is live and visible to customers"
                          : "Your store is hidden from customers"}
                      </p>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-neutral-100">
                      <Button
                        className="bg-neutral-900 text-white hover:bg-neutral-800"
                        size="sm"
                        onPress={handleSaveDesign}
                        isDisabled={isSaving}
                      >
                        {isSaving ? "Saving..." : "Save preferences"}
                      </Button>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                    <h3 className="text-sm font-semibold text-red-900 mb-2">Delete store</h3>
                    <p className="text-xs text-red-700 mb-4">
                      Permanently delete this store and all products. This action cannot be undone.
                    </p>
                    <Button 
                      variant="bordered" 
                      size="sm"
                      className="border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Delete store
                    </Button>
                  </div>
                </div>
              </Tabs.Panel>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        storeId={store.id}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onProductAdded={fetchItems}
      />
    </div>
  );
}