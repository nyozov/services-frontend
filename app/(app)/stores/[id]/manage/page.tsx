"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button, Card, Spinner, Switch, Label, Tabs } from "@heroui/react";
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
import { itemsApi } from "@/lib/services/api";

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
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

  // Store customization state (placeholder)
  const [storeSettings, setStoreSettings] = useState({
    primaryColor: "#3b82f6",
    showBranding: true,
    enableReviews: false,
    showSocialLinks: false,
    bannerImage: null as string | null,
  });

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
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch stores");
      const stores = await response.json();
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
                  <p className="text-2xl font-bold text-gray-900">1,234</p>
                  <p className="text-xs text-green-600">+12% this week</p>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  className="w-full justify-start gap-2"
                >
                  <IoAdd size={18} />
                  Add Product
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-start gap-2"
                >
                  <IoCreateOutline size={18} />
                  Edit Store Info
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-start gap-2"
                >
                  <IoColorPaletteOutline size={18} />
                  Change Theme
                </Button>
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

                    <Card className="p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">
                        Banner Image
                      </h3>
                      <div className="aspect-video bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg mb-4 flex items-center justify-center">
                        <IoImageOutline size={48} className="text-white/50" />
                      </div>
                      <Button variant="secondary" className="w-full">
                        Upload Banner Image
                      </Button>
                    </Card>

                    <Card className="p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">
                        Theme Color
                      </h3>
                      <div className="flex gap-3 mb-4">
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
                              setStoreSettings({
                                ...storeSettings,
                                primaryColor: color,
                              })
                            }
                            className={`w-12 h-12 rounded-lg border-2 ${
                              storeSettings.primaryColor === color
                                ? "border-gray-900"
                                : "border-transparent"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-gray-500">
                        Selected: {storeSettings.primaryColor}
                      </p>
                    </Card>

                    <Card className="p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">
                        Store Logo
                      </h3>
                      <div className="w-32 h-32 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                        <IoImageOutline size={32} className="text-gray-400" />
                      </div>
                      <Button variant="secondary">Upload Logo</Button>
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
                            setStoreSettings({
                              ...storeSettings,
                              showBranding: checked,
                            })
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
                            onValueChange={(checked) =>
                              setStoreSettings({
                                ...storeSettings,
                                enableReviews: checked,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="font-semibold text-gray-900">
                              Social Links
                            </Label>
                            <p className="text-sm text-gray-500">
                              Show social media links on your store
                            </p>
                          </div>
                          <Switch
                            isSelected={storeSettings.showSocialLinks}
                            onValueChange={(checked) =>
                              setStoreSettings({
                                ...storeSettings,
                                showSocialLinks: checked,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <Label className="font-semibold text-gray-900 mb-3 block">
                          Store Status
                        </Label>
                        <div className="flex gap-3">
                          <Button
                            variant={store.isActive ? "primary" : "secondary"}
                          >
                            Active
                          </Button>
                          <Button
                            variant={!store.isActive ? "primary" : "secondary"}
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
