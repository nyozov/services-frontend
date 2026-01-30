"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, Spinner, Select, Label, ListBox } from "@heroui/react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { IoTrendingUpOutline, IoCartOutline, IoCashOutline, IoStorefrontOutline } from "react-icons/io5";

interface Order {
  id: string;
  amount: string;
  platformFee: string;
  status: string;
  createdAt: string;
  item: {
    name: string;
    store: {
      id: string;
      name: string;
    };
  };
}

interface Store {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      // Fetch orders and stores
      const [ordersRes, storesRes] = await Promise.all([
        fetch("http://localhost:3000/api/orders", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://localhost:3000/api/stores", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const ordersData = await ordersRes.json();
      const storesData = await storesRes.json();

      setOrders(ordersData);
      setStores(storesData);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter orders based on selected store and date range
  const filteredOrders = orders.filter((order) => {
    const orderDate = new Date(order.createdAt);
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

    const matchesStore = selectedStore === "all" || order.item.store.id === selectedStore;
    const matchesDate = orderDate >= daysAgo;

    return matchesStore && matchesDate;
  });

  // Calculate KPIs
  const totalRevenue = filteredOrders
    .filter((o) => o.status === "paid")
    .reduce((sum, order) => sum + parseFloat(order.amount), 0);

  const totalOrders = filteredOrders.filter((o) => o.status === "paid").length;

  const platformRevenue = filteredOrders
    .filter((o) => o.status === "paid")
    .reduce((sum, order) => sum + parseFloat(order.platformFee), 0);

  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Prepare chart data - Revenue by day
  const revenueByDay = filteredOrders
    .filter((o) => o.status === "paid")
    .reduce((acc: any, order) => {
      const date = new Date(order.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (!acc[date]) {
        acc[date] = { date, revenue: 0, orders: 0 };
      }
      acc[date].revenue += parseFloat(order.amount);
      acc[date].orders += 1;
      return acc;
    }, {});

  const revenueChartData = Object.values(revenueByDay).slice(-14); // Last 14 days

  // Orders by status
  const ordersByStatus = filteredOrders.reduce((acc: any, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  const statusChartData = Object.entries(ordersByStatus).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
  }));

  const COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6"];

  // Top products
  const productSales = filteredOrders
    .filter((o) => o.status === "paid")
    .reduce((acc: any, order) => {
      const productName = order.item.name;
      if (!acc[productName]) {
        acc[productName] = { name: productName, sales: 0, revenue: 0 };
      }
      acc[productName].sales += 1;
      acc[productName].revenue += parseFloat(order.amount);
      return acc;
    }, {});

  const topProductsData = Object.values(productSales)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Track your sales performance</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <Select
          selectedKey={selectedStore}
          onSelectionChange={(key) => setSelectedStore(key as string)}
        >
          <Label>Store</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all">
                <Label>All Stores</Label>
              </ListBox.Item>
              {stores.map((store) => (
                <ListBox.Item key={store.id} id={store.id}>
                  <Label>{store.name}</Label>
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select
          selectedKey={dateRange}
          onSelectionChange={(key) => setDateRange(key as string)}
        >
          <Label>Time Period</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="7">
                <Label>Last 7 days</Label>
              </ListBox.Item>
              <ListBox.Item id="30">
                <Label>Last 30 days</Label>
              </ListBox.Item>
              <ListBox.Item id="90">
                <Label>Last 90 days</Label>
              </ListBox.Item>
              <ListBox.Item id="365">
                <Label>Last year</Label>
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 ">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900">
                ${totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <IoCashOutline className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 ">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{totalOrders}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <IoCartOutline className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 ">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Avg Order Value</p>
              <p className="text-3xl font-bold text-gray-900">
                ${avgOrderValue.toFixed(2)}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <IoTrendingUpOutline className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 ">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Platform Fees</p>
              <p className="text-3xl font-bold text-gray-900">
                ${platformRevenue.toFixed(2)}
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <IoStorefrontOutline className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: 12 }} />
              <YAxis stroke="#6b7280" style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Orders by Status */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Orders by Status
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top Products */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top Products
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topProductsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: 12 }} />
            <YAxis stroke="#6b7280" style={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}