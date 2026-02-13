"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, Spinner, Button, ScrollShadow } from "@heroui/react";
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
  IoCalendarOutline,
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

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

  const stats = useMemo(() => {
    const totals = orders.reduce(
      (acc, order) => {
        acc.gross += Number(order.amount) || 0;
        acc.refunded += Number(order.refundAmount) || 0;
        return acc;
      },
      { gross: 0, refunded: 0 }
    );

    return {
      count: orders.length,
      gross: totals.gross,
      refunded: totals.refunded,
      net: totals.gross - totals.refunded,
    };
  }, [orders]);

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
      completed: "bg-neutral-500",
      refunded: "bg-red-500",
      partially_refunded: "bg-orange-500",
      cancelled: "bg-neutral-400",
    };
    return colors[status] || "bg-neutral-500";
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
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <Spinner size="lg" color="default" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
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
      <div className="min-h-screen bg-neutral-50">
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

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
                Total orders
              </p>
              <p className="text-2xl font-semibold text-neutral-900">{stats.count}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
                Gross revenue
              </p>
              <p className="text-2xl font-semibold text-neutral-900">
                {currencyFormatter.format(stats.gross)}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
                Refunded
              </p>
              <p className="text-2xl font-semibold text-red-600">
                {currencyFormatter.format(stats.refunded)}
              </p>
            </div>
          </div>

          {/* Orders Table */}
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-12">
              <div className="text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                  <IoReceiptOutline size={32} className="text-neutral-400" />
                </div>
                <h3 className="text-base font-semibold text-neutral-900 mb-2">
                  No orders yet
                </h3>
                <p className="text-sm text-neutral-500">
                  Orders will appear here when customers make purchases
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider bg-neutral-50">
                        Product
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider bg-neutral-50">
                        Customer
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider bg-neutral-50">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider bg-neutral-50">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider bg-neutral-50">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {orders.map((order) => {
                      const productImage = order.item.images?.[0]?.url;
                      
                      return (
                        <tr
                          key={order.id}
                          onClick={() => handleRowClick(order)}
                          className="hover:bg-neutral-50 cursor-pointer transition-colors"
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
          )}
        </div>
      </div>

      {/* Order Details Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedOrder && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-neutral-50 flex items-center justify-between">
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

            {/* Content */}
            <ScrollShadow className="flex-1 p-6 space-y-6" hideScrollBar>
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${getStatusBadge(selectedOrder.status)}`}
                >
                  <span className={`w-2 h-2 rounded-full ${getStatusDot(selectedOrder.status)}`} />
                  {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1).replace('_', ' ')}
                </span>
              </div>

              {/* Product */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wide">
                  Product
                </h3>
                <div className="rounded-xl border border-neutral-200 overflow-hidden bg-white">
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

              {/* Customer */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wide">
                  Customer
                </h3>
                <div className="rounded-lg bg-neutral-50 p-4 space-y-2">
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

              {/* Shipping Address */}
              {selectedOrder.shippingAddress?.address && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wide">
                    Shipping address
                  </h3>
                  <div className="rounded-lg bg-neutral-50 p-4">
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

              {/* Payment Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wide">
                  Payment
                </h3>
                <div className="rounded-lg bg-neutral-50 p-4 space-y-3">
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

              {/* Timeline */}
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

            {/* Actions Footer */}
            <div className="border-t bg-neutral-50 p-6">
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

      {/* Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
          onClick={handleCloseDrawer}
        />
      )}

      {/* Refund Modal */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-200">
              <h3 className="text-lg font-semibold text-neutral-900">
                {refundSuccess ? "Refund processed" : "Issue refund"}
              </h3>
            </div>

            {/* Modal Body */}
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
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
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
                      className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent resize-none"
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

            {/* Modal Footer */}
            {!refundSuccess && (
              <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-3">
                <Button
                  variant="bordered"
                  size="sm"
                  onPress={() => {
                    setIsRefundModalOpen(false);
                    setRefundError(null);
                  }}
                  className="border-neutral-200 text-neutral-700 hover:bg-neutral-50"
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