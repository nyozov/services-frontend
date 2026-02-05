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
  IoCreateOutline,
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

  // Store customization state (placeholder)
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/stores">
                <Button variant="ghost" size="sm" isIconOnly>
                  <IoArrowBack size={20} />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {store.name}
                </h1>
                <p className="text-sm text-gray-500">Store Management</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {saveMessage && (
                <span className="text-sm text-gray-600">{saveMessage}</span>
              )}
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  store.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {store.isActive ? "Live" : "Inactive"}
              </span>
              <Link href={`/store/${store.slug}`} target="_blank">
                <Button variant="secondary" size="sm" className="gap-2">
                  <IoEyeOutline size={18} />
                  Preview Store
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Store URL Card */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Store Link</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <code className="text-xs text-gray-600 flex-1 truncate">
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
                <Button variant="primary" className="w-full gap-2" size="sm">
                  Share Store
                </Button>
              </div>
            </Card>

            {/* Quick Stats */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {items.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Products</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {items.filter((i) => i.isActive).length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Store Views</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {store.viewCount}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <Card className="p-1">
              <Tabs
                selectedKey={activeTab}
                onSelectionChange={(key) => setActiveTab(key as string)}
              >
                <Tabs.List className="w-full">
                  <Tabs.Tab id="products" className="flex-1">
                    <IoGridOutline size={18} />
                    <span className="ml-2">Products</span>
                  </Tabs.Tab>
                  <Tabs.Tab id="design" className="flex-1">
                    <IoColorPaletteOutline size={18} />
                    <span className="ml-2">Design</span>
                  </Tabs.Tab>
                  <Tabs.Tab id="settings" className="flex-1">
                    <IoSettingsOutline size={18} />
                    <span className="ml-2">Settings</span>
                  </Tabs.Tab>
                </Tabs.List>

                {/* Products Tab */}
                <Tabs.Panel id="products">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-gray-900">
                        Products
                      </h2>
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
                      <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                        <IoGridOutline
                          size={48}
                          className="mx-auto text-gray-300 mb-4"
                        />
                        <p className="text-gray-600 mb-2">No products yet</p>
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {items.map((item) => (
                          <Card
                            key={item.id}
                            className="overflow-hidden hover:shadow-lg transition-shadow"
                          >
                            <div className="flex gap-4 p-4">
                              {item.images.length > 0 && item.images[0]?.url ? (
                                <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0">
                                  <img
                                    src={item.images[0].url}
                                    alt={item.name}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                </div>
                              ) : (
                                <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
                                  <IoImageOutline
                                    size={24}
                                    className="text-gray-400"
                                  />
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-2">
                                  <h3 className="font-semibold text-gray-900 truncate">
                                    {item.name}
                                  </h3>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ml-2 flex-shrink-0 ${
                                      item.isActive
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {item.isActive ? "Active" : "Inactive"}
                                  </span>
                                </div>

                                {item.description && (
                                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                                    {item.description}
                                  </p>
                                )}

                                <p className="text-lg font-bold text-primary mb-3">
                                  ${Number(item.price).toFixed(2)}
                                </p>

                                <div className="flex gap-2">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="flex-1"
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1"
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </Tabs.Panel>

                {/* Design Tab */}
                <Tabs.Panel id="design">
                  <div className="p-6 space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-4">
                        Store Design
                      </h2>
                      <p className="text-gray-600 text-sm mb-6">
                        Customize the look and feel of your store
                      </p>
                    </div>

                    <Card className="p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">
                          Brand Kit
                        </h3>
                        <div
                          className="w-10 h-10 rounded-full border"
                          style={{
                            backgroundColor: storeSettings.primaryColor,
                          }}
                        />
                      </div>

                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold text-gray-900">
                            Logo Image
                          </Label>
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-2xl bg-gray-100 border flex items-center justify-center overflow-hidden">
                              {logoPreview || storeSettings.logoImage ? (
                                <img
                                  src={
                                    logoPreview || storeSettings.logoImage || ""
                                  }
                                  alt="Store logo"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <IoImageOutline
                                  size={28}
                                  className="text-gray-400"
                                />
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (!file) return;
                                  setLogoFile(file);
                                  setLogoPreview(URL.createObjectURL(file));
                                }}
                              />
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onPress={handleLogoUpload}
                                  isDisabled={!logoFile || isUploadingLogo}
                                >
                                  {isUploadingLogo
                                    ? "Uploading..."
                                    : "Upload Logo"}
                                </Button>
                                <p className="text-xs text-gray-500">
                                  Square image works best.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-semibold text-gray-900">
                            Banner Image
                          </Label>
                          <div className="aspect-[16/9] rounded-2xl overflow-hidden border bg-gray-100 flex items-center justify-center">
                            {bannerPreview || storeSettings.bannerImage ? (
                              <img
                                src={
                                  bannerPreview ||
                                  storeSettings.bannerImage ||
                                  ""
                                }
                                alt="Store banner"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <IoImageOutline
                                size={36}
                                className="text-gray-400"
                              />
                            )}
                          </div>
                          <div className="space-y-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) return;
                                setBannerFile(file);
                                setBannerPreview(URL.createObjectURL(file));
                              }}
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              onPress={handleBannerUpload}
                              isDisabled={!bannerFile || isUploadingBanner}
                            >
                              {isUploadingBanner
                                ? "Uploading..."
                                : "Upload Banner"}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {uploadError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                          <p className="text-sm text-red-700">{uploadError}</p>
                        </div>
                      )}

                      <div className="space-y-4">
                        <Label className="text-sm font-semibold text-gray-900">
                          Theme Color
                        </Label>
                        <div className="flex flex-wrap items-center gap-3">
                          <input
                            type="color"
                            value={storeSettings.primaryColor}
                            onChange={(event) =>
                              setStoreSettings((prev) => ({
                                ...prev,
                                primaryColor: event.target.value,
                              }))
                            }
                            className="h-12 w-12 rounded-lg border border-gray-200 bg-white"
                          />
                          <Input
                            value={storeSettings.primaryColor}
                            onChange={(event) =>
                              setStoreSettings((prev) => ({
                                ...prev,
                                primaryColor: event.target.value,
                              }))
                            }
                          />
                          <div className="flex gap-2">
                            {[
                              "#3b82f6",
                              "#10b981",
                              "#f59e0b",
                              "#ef4444",
                              "#8b5cf6",
                            ].map((color) => (
                              <button
                                key={color}
                                onClick={() =>
                                  setStoreSettings((prev) => ({
                                    ...prev,
                                    primaryColor: color,
                                  }))
                                }
                                className={`h-10 w-10 rounded-lg border-2 ${
                                  storeSettings.primaryColor === color
                                    ? "border-gray-900"
                                    : "border-transparent"
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          variant="primary"
                          onPress={handleSaveDesign}
                          isDisabled={isSaving}
                        >
                          {isSaving ? (
                            <span className="inline-flex items-center gap-2">
                              <Spinner size="sm" color="current" />
                              Saving
                            </span>
                          ) : (
                            "Save Design"
                          )}
                        </Button>
                      </div>
                    </Card>

                    <Card className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="font-semibold text-gray-900">
                            Social Links
                          </Label>
                          <p className="text-sm text-gray-500">
                            Show social links on your storefront
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
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs uppercase tracking-wide text-gray-500">
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
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs uppercase tracking-wide text-gray-500">
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
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs uppercase tracking-wide text-gray-500">
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
                            />
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>
                </Tabs.Panel>

                {/* Settings Tab */}
                <Tabs.Panel id="settings">
                  <div className="p-6 space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-4">
                        Store Settings
                      </h2>
                      <p className="text-gray-600 text-sm mb-6">
                        Configure your store features and preferences
                      </p>
                    </div>

                    <Card className="p-6 space-y-4">
                      <h3 className="font-semibold text-gray-900">
                        Store Info
                      </h3>
                      <div className="grid gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs uppercase tracking-wide text-gray-500">
                            Store Name
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
                        <div className="space-y-1">
                          <Label className="text-xs uppercase tracking-wide text-gray-500">
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
                            placeholder="Tell shoppers about your brand"
                            rows={4}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="primary"
                          onPress={handleSaveInfo}
                          isDisabled={isSaving}
                        >
                          {isSaving ? (
                            <span className="inline-flex items-center gap-2">
                              <Spinner size="sm" color="current" />
                              Saving
                            </span>
                          ) : (
                            "Save Info"
                          )}
                        </Button>
                      </div>
                    </Card>

                    <Card className="p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="font-semibold text-gray-900">
                            Show Branding
                          </Label>
                          <p className="text-sm text-gray-500">
                            Display "Powered by YourApp" in footer
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

                      <div className="border-t pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="font-semibold text-gray-900">
                              Enable Reviews
                            </Label>
                            <p className="text-sm text-gray-500">
                              Allow customers to leave product reviews
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
                      </div>

                      <div className="border-t pt-6">
                        <Label className="font-semibold text-gray-900 mb-3 block">
                          Store Status
                        </Label>
                        <div className="flex gap-3">
                          <Button
                            variant={store.isActive ? "primary" : "secondary"}
                            onPress={() => handleStatusChange(true)}
                          >
                            Active
                          </Button>
                          <Button
                            variant={!store.isActive ? "primary" : "secondary"}
                            onPress={() => handleStatusChange(false)}
                          >
                            Inactive
                          </Button>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          {store.isActive
                            ? "Your store is live and visible to customers"
                            : "Your store is hidden from customers"}
                        </p>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          variant="primary"
                          onPress={handleSaveDesign}
                          isDisabled={isSaving}
                        >
                          {isSaving ? (
                            <span className="inline-flex items-center gap-2">
                              <Spinner size="sm" color="current" />
                              Saving
                            </span>
                          ) : (
                            "Save Preferences"
                          )}
                        </Button>
                      </div>
                    </Card>

                    <Card className="p-6 bg-red-50 border-red-200">
                      <h3 className="font-semibold text-red-900 mb-2">
                        Danger Zone
                      </h3>
                      <p className="text-sm text-red-700 mb-4">
                        Permanently delete this store and all its products
                      </p>
                      <Button variant="ghost" className="text-red-600">
                        Delete Store
                      </Button>
                    </Card>
                  </div>
                </Tabs.Panel>
              </Tabs>
            </Card>
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
