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
  IoCashOutline
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
  item: {
    name: string;
    description?: string;
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
  
  // Drawer state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Refund modal state
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      shipped: "bg-blue-100 text-blue-800",
      completed: "bg-gray-100 text-gray-800",
      refunded: "bg-red-100 text-red-800",
      partially_refunded: "bg-orange-100 text-orange-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string, size = 20) => {
    switch (status) {
      case "paid":
      case "completed":
        return <IoCheckmarkCircle className="text-green-600" size={size} />;
      case "refunded":
      case "cancelled":
        return <IoAlertCircle className="text-red-600" size={size} />;
      default:
        return <IoReceiptOutline className="text-gray-600" size={size} />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="p-6">
          <p className="text-red-600">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Orders</h1>
          <p className="text-gray-600">Manage your sales and orders</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total Orders</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.count}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Gross Revenue</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">
              {currencyFormatter.format(stats.gross)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Refunded</p>
            <p className="text-2xl font-semibold text-red-600 mt-2">
              {currencyFormatter.format(stats.refunded)}
            </p>
          </Card>
        </div>

        {orders.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <IoReceiptOutline size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-900 font-semibold mb-2">No orders yet</p>
            <p className="text-sm text-gray-500">
              Orders will appear here when customers make purchases
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Store
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr 
                      key={order.id} 
                      onClick={() => handleRowClick(order)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-600">
                          {order.id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="font-medium text-gray-900">
                            {order.buyerName || "—"}
                          </p>
                          <p className="text-sm text-gray-500">{order.buyerEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-900">{order.item.name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-900">{order.item.store.name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-gray-900">
                          {currencyFormatter.format(Number(order.amount))}
                        </span>
                        {order.refundAmount ? (
                          <p className="text-xs text-red-600 mt-1">
                            Refunded {currencyFormatter.format(Number(order.refundAmount))}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status, 16)}
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Order Details Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedOrder && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Order Details</h2>
                <p className="text-sm text-gray-500 font-mono mt-0.5">
                  {selectedOrder.id.slice(0, 12)}...
                </p>
              </div>
              <button
                onClick={handleCloseDrawer}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <IoClose size={24} className="text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <ScrollShadow className="flex-1 p-6 space-y-6" hideScrollBar>
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                {getStatusIcon(selectedOrder.status)}
                <span
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(
                    selectedOrder.status
                  )}`}
                >
                  {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1).replace('_', ' ')}
                </span>
              </div>

              {/* Customer Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Customer
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <IoPersonOutline size={18} className="text-gray-400" />
                    <span>{selectedOrder.buyerName || "No name provided"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <IoMailOutline size={18} className="text-gray-400" />
                    <span className="text-sm">{selectedOrder.buyerEmail}</span>
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Product
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-gray-900">{selectedOrder.item.name}</p>
                  {selectedOrder.item.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedOrder.item.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Store: {selectedOrder.item.store.name}
                  </p>
                </div>
              </div>

              {/* Payment Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Payment
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order total</span>
                    <span className="font-semibold text-gray-900">
                      {currencyFormatter.format(Number(selectedOrder.amount))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Platform fee</span>
                    <span className="text-gray-600">
                      -{currencyFormatter.format(Number(selectedOrder.platformFee))}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between">
                    <span className="font-medium text-gray-900">Your earnings</span>
                    <span className="font-semibold text-green-600">
                      {currencyFormatter.format(
                        Number(selectedOrder.amount) - Number(selectedOrder.platformFee)
                      )}
                    </span>
                  </div>
                  {selectedOrder.refundAmount && (
                    <div className="pt-2 border-t border-red-200 flex justify-between">
                      <span className="text-red-600">Refunded</span>
                      <span className="font-semibold text-red-600">
                        -{currencyFormatter.format(Number(selectedOrder.refundAmount))}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Timeline */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Timeline
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Order placed</p>
                      <p className="text-xs text-gray-500">
                        {new Date(selectedOrder.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {selectedOrder.refundedAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Refunded</p>
                        <p className="text-xs text-gray-500">
                          {new Date(selectedOrder.refundedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollShadow>

            {/* Actions Footer */}
            <div className="border-t bg-gray-50 p-6 space-y-3">
              <Button
                variant="danger"
                className="w-full"
                onPress={handleRefundClick}
                isDisabled={selectedOrder.status === "refunded" || selectedOrder.status === "cancelled"}
              >
                <IoRefreshOutline size={18} className="mr-2" />
                {selectedOrder.status === "refunded"
                  ? "Already Refunded"
                  : selectedOrder.status === "partially_refunded"
                    ? "Issue Additional Refund"
                    : "Issue Refund"}
              </Button>
              
              {/* Placeholder for future actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="ghost" size="sm" isDisabled>
                  Mark as Shipped
                </Button>
                <Button variant="ghost" size="sm" isDisabled>
                  Send Receipt
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
          onClick={handleCloseDrawer}
        />
      )}

      {/* Refund Confirmation Modal */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b">
              <h3 className="text-xl font-semibold">
                {refundSuccess ? "Refund Processed" : "Issue Refund"}
              </h3>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4">
              {refundSuccess ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IoCheckmarkCircle size={32} className="text-green-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Refund Successful
                  </h4>
                  <p className="text-gray-600">
                    The refund has been processed and the customer will be notified.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> This will refund the customer and reverse the payment.
                      Platform fees will also be refunded.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Refund Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <IoCashOutline size={18} className="text-gray-400" />
                      </div>
                      <input
                        type="number"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="0.00"
                        step="0.01"
                        max={Number(selectedOrder?.amount)}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Max: {currencyFormatter.format(Number(selectedOrder?.amount || 0))}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason (optional)
                    </label>
                    <textarea
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                      placeholder="e.g., Customer requested refund, item damaged, etc."
                      rows={3}
                    />
                  </div>

                  {refundError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <p className="text-sm text-red-700">{refundError}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {!refundSuccess && (
              <div className="px-6 py-4 border-t flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onPress={() => {
                    setIsRefundModalOpen(false);
                    setRefundError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onPress={handleRefund}
                  isDisabled={
                    isRefunding ||
                    !refundAmount ||
                    Number.parseFloat(refundAmount) <= 0 ||
                    Number.parseFloat(refundAmount) > Number(selectedOrder?.amount || 0)
                  }
                >
                  {isRefunding ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner size="sm" color="current" />
                      Processing
                    </span>
                  ) : (
                    "Process Refund"
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
