"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, Spinner, Button, ScrollShadow, Input } from "@heroui/react";
import { 
  IoClose, 
  IoRefreshOutline, 
  IoMailOutline, 
  IoCheckmarkCircle,
  IoAlertCircle,
  IoReceiptOutline,
  IoPersonOutline,
  IoCashOutline,
  IoImageOutline,
  IoStorefrontOutline,
  IoSearchOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
} from "react-icons/io5";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

interface Order {
  id: string;
  itemId: string;
  buyerEmail: string;
  buyerName: string | null;
  amount: number;
  platformFee: number;
  status: string;
  createdAt: string;
  stripePaymentId?: string;
  refundedAt?: string;
  refundAmount?: number;
  shippingAddress?: {
    name?: string;
    phone?: string;
    address?: {
      city?: string;
      line1?: string;
      line2?: string;
      state?: string;
      country?: string;
      postal_code?: string;
    };
  };
  item: {
    name: string;
    description?: string;
    images: Array<{ url: string; publicId: string; position?: number }>;
    store: {
      name: string;
      slug: string;
    };
  };
}

const ORDERS_PER_PAGE = 20;

export default function OrdersPage() {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundSuccess, setRefundSuccess] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();

      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${apiBase}/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  // Action items
  const actionItems = useMemo(() => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    
    const needsAttention = orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return o.status === 'paid' && orderDate < threeDaysAgo;
    });

    const recentOrders = orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return o.status === 'paid' && orderDate > oneDayAgo;
    });

    const pendingOrders = orders.filter(o => o.status === 'pending');

    return {
      needsAttention,
      recentOrders,
      pendingOrders,
    };
  }, [orders]);

  // Filtered and searched orders
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o => 
        o.item.name.toLowerCase().includes(query) ||
        o.buyerEmail.toLowerCase().includes(query) ||
        o.buyerName?.toLowerCase().includes(query) ||
        o.shippingAddress?.name?.toLowerCase().includes(query) ||
        o.id.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [orders, statusFilter, searchQuery]);

  // Pagination
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
    const endIndex = startIndex + ORDERS_PER_PAGE;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleRowClick = (order: Order) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedOrder(null), 300);
  };

  const handleRefundClick = () => {
    if (selectedOrder) {
      setRefundAmount(Number(selectedOrder.amount).toFixed(2));
      setRefundReason("");
      setRefundError(null);
      setIsRefundModalOpen(true);
    }
  };

  const handleRefund = async () => {
    if (!selectedOrder) return;

    setIsRefunding(true);
    setRefundError(null);
    const maxRefund = Number(selectedOrder.amount) || 0;
    const amountValue = Number.parseFloat(refundAmount);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setRefundError("Enter a valid refund amount.");
      setIsRefunding(false);
      return;
    }

    if (amountValue > maxRefund) {
      setRefundError(`Refund amount can't exceed ${currencyFormatter.format(maxRefund)}.`);
      setIsRefunding(false);
      return;
    }

    try {
      const token = await getToken();
      
      const response = await fetch(`${apiBase}/stripe/refund`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          amount: amountValue,
          reason: refundReason,
          refundPlatformFee: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Failed to process refund");
      }

      setRefundSuccess(true);
      
      setTimeout(() => {
        fetchOrders();
        setIsRefundModalOpen(false);
        setIsDrawerOpen(false);
        setRefundSuccess(false);
        setRefundAmount("");
        setRefundReason("");
      }, 2000);

    } catch (err) {
      setRefundError(err instanceof Error ? err.message : "Failed to process refund");
    } finally {
      setIsRefunding(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
      shipped: "bg-blue-50 text-blue-700 border-blue-200",
      completed: "bg-neutral-100 text-neutral-700 border-neutral-200",
      refunded: "bg-red-50 text-red-700 border-red-200",
      partially_refunded: "bg-orange-50 text-orange-700 border-orange-200",
      cancelled: "bg-neutral-100 text-neutral-600 border-neutral-200",
    };
    return styles[status] || "bg-neutral-100 text-neutral-700 border-neutral-200";
  };

  const getStatusDot = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-500",
      paid: "bg-emerald-500",
      shipped: "bg-blue-500",
      completed: "0",
      refunded: "bg-red-500",
      partially_refunded: "bg-orange-500",
      cancelled: "bg-neutral-400",
    };
    return colors[status] || "0";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      year: "numeric"
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", { 
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen ">
        <Spinner size="lg" color="default" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen  flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <IoAlertCircle size={24} className="text-red-600" />
          </div>
          <p className="text-neutral-900 font-medium mb-2">Failed to load orders</p>
          <p className="text-sm text-neutral-500 mb-6">{error}</p>
          <Button onPress={fetchOrders} variant="secondary" size="sm">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen ">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mb-2">
              Orders
            </h1>
            <p className="text-sm text-neutral-500">
              {orders.length === 0 ? "No orders yet" : `${orders.length} total orders`}
            </p>
          </div>

          {/* Action Items */}
          {orders.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Needs Attention */}
              <div className="rounded-xl bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-amber-900 uppercase tracking-wide mb-1">
                      Needs attention
                    </p>
                    <p className="text-2xl font-semibold text-amber-900 mb-1">
                      {actionItems.needsAttention.length}
                    </p>
                    <p className="text-xs text-amber-700">
                      Orders over 3 days old
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="rounded-xl bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-blue-900 uppercase tracking-wide mb-1">
                      Last 24 hours
                    </p>
                    <p className="text-2xl font-semibold text-blue-900 mb-1">
                      {actionItems.recentOrders.length}
                    </p>
                    <p className="text-xs text-blue-700">
                      New orders to process
                    </p>
                  </div>
                </div>
              </div>

              {/* Pending */}
              <div className="rounded-xl  bg-white p-4">
                <div className="flex items-start gap-3">
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                      Pending payment
                    </p>
                    <p className="text-2xl font-semibold text-neutral-900 mb-1">
                      {actionItems.pendingOrders.length}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Awaiting completion
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters & Search */}
          <div className="rounded-xl  bg-white p-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <IoSearchOutline 
                    size={16} 
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type="text"
                    placeholder="Search orders, customers, products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm  rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: "all", label: "All" },
                  { value: "paid", label: "Paid" },
                  { value: "pending", label: "Pending" },
                  { value: "shipped", label: "Shipped" },
                  { value: "refunded", label: "Refunded" },
                ].map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setStatusFilter(status.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      statusFilter === status.value
                        ? "bg-neutral-900 text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Orders Table */}
          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl  bg-white p-12">
              <div className="text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                  <IoReceiptOutline size={32} className="text-neutral-400" />
                </div>
                <h3 className="text-base font-semibold text-neutral-900 mb-2">
                  {searchQuery || statusFilter !== "all" ? "No orders found" : "No orders yet"}
                </h3>
                <p className="text-sm text-neutral-500">
                  {searchQuery || statusFilter !== "all" 
                    ? "Try adjusting your search or filters" 
                    : "Orders will appear here when customers make purchases"}
                </p>
                {(searchQuery || statusFilter !== "all") && (
                  <Button
                    onPress={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                    }}
                    variant="bordered"
                    size="sm"
                    className="mt-4"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-xl  bg-white overflow-hidden mb-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider ">
                          Product
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider ">
                          Customer
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider ">
                          Amount
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider ">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider ">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {paginatedOrders.map((order) => {
                        const productImage = order.item.images?.[0]?.url;
                        
                        return (
                          <tr
                            key={order.id}
                            onClick={() => handleRowClick(order)}
                            className="hover: cursor-pointer transition-colors"
                          >
                            {/* Product */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-neutral-100 flex-shrink-0 overflow-hidden">
                                  {productImage ? (
                                    <img
                                      src={productImage}
                                      alt={order.item.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <IoImageOutline size={16} className="text-neutral-300" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-neutral-900 truncate">
                                    {order.item.name}
                                  </p>
                                  <p className="text-xs text-neutral-500 truncate">
                                    {order.item.store.name}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Customer */}
                            <td className="py-3 px-4">
                              <div>
                                <p className="text-sm font-medium text-neutral-900">
                                  {order.shippingAddress?.name || order.buyerName || "—"}
                                </p>
                                <p className="text-xs text-neutral-500">{order.buyerEmail}</p>
                              </div>
                            </td>

                            {/* Amount */}
                            <td className="py-3 px-4">
                              <div>
                                <p className="text-sm font-semibold text-neutral-900">
                                  {currencyFormatter.format(Number(order.amount))}
                                </p>
                                {order.refundAmount && (
                                  <p className="text-xs text-red-600">
                                    -{currencyFormatter.format(Number(order.refundAmount))} refunded
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${getStatusBadge(order.status)}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(order.status)}`} />
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                              </span>
                            </td>

                            {/* Date */}
                            <td className="py-3 px-4">
                              <div className="text-sm text-neutral-600">
                                <p>{formatDate(order.createdAt)}</p>
                                <p className="text-xs text-neutral-400">{formatTime(order.createdAt)}</p>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl  bg-white">
                  <div className="text-sm text-neutral-500">
                    Showing {((currentPage - 1) * ORDERS_PER_PAGE) + 1} to{" "}
                    {Math.min(currentPage * ORDERS_PER_PAGE, filteredOrders.length)} of{" "}
                    {filteredOrders.length} orders
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg  hover: disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <IoChevronBackOutline size={16} className="text-neutral-600" />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // Show first, last, current, and adjacent pages
                          return (
                            page === 1 ||
                            page === totalPages ||
                            Math.abs(page - currentPage) <= 1
                          );
                        })
                        .map((page, index, array) => {
                          // Add ellipsis
                          const prevPage = array[index - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;
                          
                          return (
                            <div key={page} className="flex items-center gap-1">
                              {showEllipsis && (
                                <span className="px-2 text-neutral-400">...</span>
                              )}
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                  currentPage === page
                                    ? "bg-neutral-900 text-white"
                                    : "text-neutral-600 hover:bg-neutral-100"
                                }`}
                              >
                                {page}
                              </button>
                            </div>
                          );
                        })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg  hover: disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <IoChevronForwardOutline size={16} className="text-neutral-600" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Order Details Drawer - Same as before */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedOrder && (
          <div className="h-full flex flex-col">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Order details</h2>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">
                  {selectedOrder.id.slice(0, 16)}
                </p>
              </div>
              <button
                onClick={handleCloseDrawer}
                className="w-8 h-8 rounded-lg hover:bg-neutral-200 flex items-center justify-center transition-colors"
              >
                <IoClose size={20} className="text-neutral-600" />
              </button>
            </div>

            <ScrollShadow className="flex-1 p-6 space-y-6" hideScrollBar>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${getStatusBadge(selectedOrder.status)}`}
                >
                  <span className={`w-2 h-2 rounded-full ${getStatusDot(selectedOrder.status)}`} />
                  {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1).replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wide">
                  Product
                </h3>
                <div className="rounded-xl  overflow-hidden bg-white">
                  {selectedOrder.item.images?.[0]?.url && (
                    <div className="aspect-square bg-neutral-100">
                      <img
                        src={selectedOrder.item.images[0].url}
                        alt={selectedOrder.item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="font-medium text-neutral-900 mb-1">{selectedOrder.item.name}</p>
                    {selectedOrder.item.description && (
                      <p className="text-sm text-neutral-500 line-clamp-2 mb-2">
                        {selectedOrder.item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <IoStorefrontOutline size={14} />
                      <span>{selectedOrder.item.store.name}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wide">
                  Customer
                </h3>
                <div className="rounded-lg  p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-neutral-700">
                    <IoPersonOutline size={16} className="text-neutral-400" />
                    <span>{selectedOrder.shippingAddress?.name || selectedOrder.buyerName || "No name provided"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-700">
                    <IoMailOutline size={16} className="text-neutral-400" />
                    <span>{selectedOrder.buyerEmail}</span>
                  </div>
                </div>
              </div>

              {selectedOrder.shippingAddress?.address && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wide">
                    Shipping address
                  </h3>
                  <div className="rounded-lg  p-4">
                    <div className="text-sm text-neutral-700 space-y-1">
                      <p className="font-medium text-neutral-900">
                        {selectedOrder.shippingAddress.name || selectedOrder.buyerName || "No name"}
                      </p>
                      {selectedOrder.shippingAddress.address.line1 && (
                        <p>{selectedOrder.shippingAddress.address.line1}</p>
                      )}
                      {selectedOrder.shippingAddress.address.line2 && (
                        <p>{selectedOrder.shippingAddress.address.line2}</p>
                      )}
                      <p>
                        {[
                          selectedOrder.shippingAddress.address.city,
                          selectedOrder.shippingAddress.address.state,
                          selectedOrder.shippingAddress.address.postal_code,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      {selectedOrder.shippingAddress.address.country && (
                        <p className="text-neutral-500">
                          {selectedOrder.shippingAddress.address.country}
                        </p>
                      )}
                      {selectedOrder.shippingAddress.phone && (
                        <p className="text-neutral-500 mt-2">
                          {selectedOrder.shippingAddress.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wide">
                  Payment
                </h3>
                <div className="rounded-lg  p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Order total</span>
                    <span className="font-semibold text-neutral-900">
                      {currencyFormatter.format(Number(selectedOrder.amount))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Platform fee</span>
                    <span className="text-neutral-600">
                      -{currencyFormatter.format(Number(selectedOrder.platformFee))}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-neutral-200 flex justify-between">
                    <span className="text-sm font-medium text-neutral-900">Your earnings</span>
                    <span className="font-semibold text-emerald-600">
                      {currencyFormatter.format(
                        Number(selectedOrder.amount) - Number(selectedOrder.platformFee)
                      )}
                    </span>
                  </div>
                  {selectedOrder.refundAmount && (
                    <div className="pt-3 border-t border-red-200 flex justify-between">
                      <span className="text-sm text-red-600">Refunded</span>
                      <span className="font-semibold text-red-600">
                        -{currencyFormatter.format(Number(selectedOrder.refundAmount))}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wide">
                  Timeline
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full ${getStatusDot('paid')}`} />
                      {selectedOrder.refundedAt && <div className="w-px h-8 bg-neutral-200 my-1" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium text-neutral-900 mb-0.5">Order placed</p>
                      <p className="text-xs text-neutral-500">
                        {formatDate(selectedOrder.createdAt)} at {formatTime(selectedOrder.createdAt)}
                      </p>
                    </div>
                  </div>
                  {selectedOrder.refundedAt && (
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full ${getStatusDot('refunded')}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-900 mb-0.5">Refunded</p>
                        <p className="text-xs text-neutral-500">
                          {formatDate(selectedOrder.refundedAt)} at {formatTime(selectedOrder.refundedAt)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollShadow>

            <div className="border-t  p-6">
              <Button
                className={`w-full ${
                  selectedOrder.status === "refunded" || selectedOrder.status === "cancelled"
                    ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
                onPress={handleRefundClick}
                isDisabled={selectedOrder.status === "refunded" || selectedOrder.status === "cancelled"}
                size="sm"
              >
                <IoRefreshOutline size={16} />
                {selectedOrder.status === "refunded"
                  ? "Already refunded"
                  : selectedOrder.status === "partially_refunded"
                    ? "Issue additional refund"
                    : "Issue refund"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
          onClick={handleCloseDrawer}
        />
      )}

      {/* Refund Modal - Same as before */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-neutral-200">
              <h3 className="text-lg font-semibold text-neutral-900">
                {refundSuccess ? "Refund processed" : "Issue refund"}
              </h3>
            </div>

            <div className="px-6 py-6">
              {refundSuccess ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IoCheckmarkCircle size={32} className="text-emerald-600" />
                  </div>
                  <h4 className="text-base font-semibold text-neutral-900 mb-2">
                    Refund successful
                  </h4>
                  <p className="text-sm text-neutral-600">
                    The customer will be notified of the refund
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <p className="text-xs text-amber-800">
                      This will refund the customer and reverse the payment. Platform fees will also be refunded.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 uppercase tracking-wide mb-2">
                      Refund amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <IoCashOutline size={16} className="text-neutral-400" />
                      </div>
                      <input
                        type="number"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm  rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                        placeholder="0.00"
                        step="0.01"
                        max={Number(selectedOrder?.amount)}
                      />
                    </div>
                    <p className="text-xs text-neutral-500 mt-1.5">
                      Maximum: {currencyFormatter.format(Number(selectedOrder?.amount || 0))}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 uppercase tracking-wide mb-2">
                      Reason (optional)
                    </label>
                    <textarea
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm  rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent resize-none"
                      placeholder="e.g., Customer requested, item damaged"
                      rows={3}
                    />
                  </div>

                  {refundError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                      <p className="text-xs text-red-700">{refundError}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!refundSuccess && (
              <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-3">
                <Button
                  variant="bordered"
                  size="sm"
                  onPress={() => {
                    setIsRefundModalOpen(false);
                    setRefundError(null);
                  }}
                  className="border-neutral-200 text-neutral-700 hover:"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onPress={handleRefund}
                  isDisabled={
                    isRefunding ||
                    !refundAmount ||
                    Number.parseFloat(refundAmount) <= 0 ||
                    Number.parseFloat(refundAmount) > Number(selectedOrder?.amount || 0)
                  }
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {isRefunding ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner size="sm" color="current" />
                      Processing
                    </span>
                  ) : (
                    "Process refund"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}