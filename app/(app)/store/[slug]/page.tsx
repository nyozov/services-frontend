"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, Spinner, Button, Avatar, Chip } from "@heroui/react";
import { 
  IoStorefront, 
  IoCartOutline, 
  IoShareSocialOutline,
  IoHeartOutline,
  IoLocationOutline,
  IoMailOutline,
  IoCheckmarkCircle
} from "react-icons/io5";
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
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  useEffect(() => {
    fetchStore();
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/stores/${slug}/view`, {
      method: "POST",
      credentials: "include",
    });
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
        `http://localhost:3000/api/stores/${slug}/items`,
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
      <div className="relative bg-white border-b overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid lg:grid-cols-[1fr,auto] gap-8 items-start">
            {/* Store Info */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <IoStorefront size={36} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">
                      {store.name}
                    </h1>
                  </div>
                  {store.description && (
                    <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">
                      {store.description}
                    </p>
                  )}
                  
                  {/* Placeholder stats */}
                  <div className="flex flex-wrap gap-6 mt-6 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <IoLocationOutline size={18} className="text-primary" />
                      <span>Ships Worldwide</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <IoCheckmarkCircle size={18} className="text-primary" />
                      <span>{items.length} Products</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  onPress={handleShare}
                  className="font-medium"
                >
                  <IoShareSocialOutline size={18} />
                  Share Store
                </Button>
                <Button
                  variant="primary"
                  className="font-medium"
                >
                <IoHeartOutline size={18} />  Follow
                </Button>
              </div>
            </div>

            {/* Seller Profile Card */}
            <Card className="w-full lg:w-80 border shadow-sm">
              <div className="p-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Seller
                </p>
                <div className="flex items-start gap-4">
                  <Avatar 
                    size="lg"
                    className="flex-shrink-0"
                  >
                    <Avatar.Image
                        alt="Bob"
                        src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg"
                      />
                    <Avatar.Fallback className="bg-primary/10 text-primary font-semibold">
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
                    
                    {/* Placeholder seller stats */}
                    <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Member since</span>
                        <span className="font-medium text-gray-900">2024</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Response time</span>
                        <span className="font-medium text-gray-900">1 hour</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total sales</span>
                        <span className="font-medium text-gray-900">248</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  variant="flat" 
                  color="primary"
                  className="w-full mt-6 font-medium"
                  startContent={<IoMailOutline size={18} />}
                >
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
              {items.length} {items.length === 1 ? 'item' : 'items'} available
            </p>
          </div>
          
          {/* Placeholder filters */}
          <div className="hidden md:flex gap-2">
            <Button variant="bordered" size="sm">All</Button>
            <Button variant="light" size="sm">Featured</Button>
            <Button variant="light" size="sm">New</Button>
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
            <p className="text-gray-600">
              Check back soon for new items!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <Card
                key={item.id}
                className="group overflow-hidden hover:shadow-2xl transition-all duration-300 border"
              >
                {/* Product Image */}
                <div className="relative">
                  {item.images && item.images.length > 0 ? (
                    <div className="w-full aspect-square bg-gray-100 overflow-hidden">
                      <img
                        src={item.images[0].url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <span className="text-gray-400 text-sm">No image</span>
                    </div>
                  )}
                  
                  {/* Floating action button */}
                  <Button
                    isIconOnly
                    variant="flat"
                    className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    size="sm"
                  >
                    <IoHeartOutline size={18} />
                  </Button>
                </div>

                {/* Product Info */}
                <div className="p-5">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-1">
                    {item.name}
                  </h3>

                  {item.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        ${Number(item.price).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Free shipping</p>
                    </div>
                  </div>

                  <Button
                    color="primary"
                    className="w-full font-semibold shadow-sm"
                    size="lg"
                    onPress={() => handleBuyClick(item)}
                    startContent={<IoCartOutline size={20} />}
                  >
                    Buy Now
                  </Button>
                </div>
              </Card>
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
              <h3 className="font-semibold text-gray-900 mb-3">Trust & Safety</h3>
              <p className="text-sm text-gray-600">
                Secure payments powered by Stripe.
              </p>
            </div>
          </div>
        </div>
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