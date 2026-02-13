"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, Spinner, Select, Label, ListBox } from "@heroui/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  IoTrendingUpOutline,
  IoCartOutline,
  IoCashOutline,
  IoStorefrontOutline,
  IoChevronDown,
  IoLocationOutline,
} from "react-icons/io5";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

interface Order {
  id: string;
  amount: string;
  platformFee: string;
  status: string;
  createdAt: string;
  shippingAddress?: {
    name?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  } | null;
  item: {
    name: string;
    images?: Array<{ url: string; publicId: string; position?: number }>;
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
  const [mapPoints, setMapPoints] = useState<
    Array<{ id: string; lat: number; lng: number; label: string }>
  >([]);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const [ordersRes, storesRes] = await Promise.all([
        fetch(`${apiBase}/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiBase}/stores`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const ordersData = await ordersRes.json();
      const storesData = await storesRes.json();

      console.log("Orders with shipping:", ordersData.filter((o: Order) => o.shippingAddress?.address));

      setOrders(ordersData);
      setStores(storesData);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

      const matchesStore =
        selectedStore === "all" || order.item.store.id === selectedStore;
      const matchesDate = orderDate >= daysAgo;

      return matchesStore && matchesDate;
    });
  }, [orders, selectedStore, dateRange]);

  const totalRevenue = filteredOrders
    .filter((o) => o.status === "paid")
    .reduce((sum, order) => sum + parseFloat(order.amount), 0);

  const totalOrders = filteredOrders.filter((o) => o.status === "paid").length;

  const platformRevenue = filteredOrders
    .filter((o) => o.status === "paid")
    .reduce((sum, order) => sum + parseFloat(order.platformFee), 0);

  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

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

  const revenueChartData = Object.values(revenueByDay).slice(-14);

  const ordersByStatus = filteredOrders.reduce((acc: any, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  const statusChartData = Object.entries(ordersByStatus).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
    value: count as number,
    percentage: ((count as number / filteredOrders.length) * 100).toFixed(0),
  }));

  const productSales = filteredOrders
    .filter((o) => o.status === "paid")
    .reduce((acc: any, order) => {
      const productName = order.item.name;
      if (!acc[productName]) {
        acc[productName] = {
          name: productName,
          sales: 0,
          revenue: 0,
          imageUrl: order.item.images?.[0]?.url,
        };
      }
      acc[productName].sales += 1;
      acc[productName].revenue += parseFloat(order.amount);
      if (!acc[productName].imageUrl && order.item.images?.[0]?.url) {
        acc[productName].imageUrl = order.item.images[0].url;
      }
      return acc;
    }, {});

  const topProductsData = Object.values(productSales)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 5);

  const shippingLocations = useMemo(() => {
    const locations = filteredOrders
      .filter((o) => {
        const hasAddress = o.shippingAddress?.address;
        const hasCity = o.shippingAddress?.address?.city;
        return o.status === "paid" && hasAddress && hasCity;
      })
      .map((order) => {
        const addr = order.shippingAddress!.address!;
        const label = [addr.city, addr.state, addr.country]
          .filter(Boolean)
          .join(", ");
        return {
          id: order.id,
          city: addr.city,
          state: addr.state,
          postal: addr.postal_code,
          country: addr.country,
          label: label || "Unknown destination",
        };
      });

    console.log("Shipping locations found:", locations.length);
    return locations;
  }, [filteredOrders]);

  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    shippingLocations.forEach((loc) => {
      const key = loc.label || "Unknown destination";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [shippingLocations]);

  useEffect(() => {
    if (shippingLocations.length === 0) {
      setMapPoints([]);
      return;
    }

    let isMounted = true;

    const fetchLocations = async () => {
      try {
        const countryNameMap: Record<string, string> = {
          US: "United States",
          CA: "Canada",
          GB: "United Kingdom",
          AU: "Australia",
          FR: "France",
          DE: "Germany",
          ES: "Spain",
          IT: "Italy",
        };

        const canadaProvinceMap: Record<string, string> = {
          AB: "Alberta",
          BC: "British Columbia",
          MB: "Manitoba",
          NB: "New Brunswick",
          NL: "Newfoundland and Labrador",
          NS: "Nova Scotia",
          NT: "Northwest Territories",
          NU: "Nunavut",
          ON: "Ontario",
          PE: "Prince Edward Island",
          QC: "Quebec",
          SK: "Saskatchewan",
          YT: "Yukon",
        };

        const geocode = async (query: string) => {
          try {
            const response = await fetch(
              `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
                query
              )}&count=1&language=en&format=json`
            );
            if (!response.ok) return null;
            const data = await response.json();
            return data.results?.[0] ?? null;
          } catch {
            return null;
          }
        };

        const geocodeFallback = async (query: string) => {
          try {
            await new Promise((resolve) => setTimeout(resolve, 100));
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
                query
              )}`,
              {
                headers: {
                  "Accept-Language": "en",
                },
              }
            );
            if (!response.ok) return null;
            const data = await response.json();
            const result = data?.[0];
            if (!result) return null;
            return {
              latitude: Number(result.lat),
              longitude: Number(result.lon),
            };
          } catch {
            return null;
          }
        };

        const results = await Promise.all(
          shippingLocations.map(async (location) => {
            const countryName = location.country
              ? countryNameMap[location.country] || location.country
              : undefined;

            const stateName =
              location.country === "CA" && location.state
                ? canadaProvinceMap[location.state] || location.state
                : location.state;

            const queryParts = [
              [location.city, stateName, countryName],
              [location.city, countryName],
              [stateName, countryName],
              [countryName],
            ];

            const queries = queryParts
              .map((parts) => parts.filter(Boolean).join(", "))
              .filter(Boolean);

            const cacheKey = `geo:${queries[0] ?? location.label}`;
            const cached =
              typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;

            if (cached) {
              try {
                const parsed = JSON.parse(cached) as { lat: number; lng: number };
                return {
                  id: location.id,
                  lat: parsed.lat,
                  lng: parsed.lng,
                  label: location.label,
                };
              } catch {
                localStorage.removeItem(cacheKey);
              }
            }

            let result = null;
            for (const query of queries) {
              result = await geocode(query);
              if (result) break;
              await new Promise((resolve) => setTimeout(resolve, 100));
            }

            if (!result) {
              for (const query of queries) {
                result = await geocodeFallback(query);
                if (result) break;
              }
            }

            if (!result) {
              console.log("Failed to geocode:", location.label);
              return null;
            }

            const point = {
              id: location.id,
              lat: result.latitude,
              lng: result.longitude,
              label: location.label,
            };

            if (typeof window !== "undefined") {
              localStorage.setItem(
                cacheKey,
                JSON.stringify({ lat: point.lat, lng: point.lng })
              );
            }

            return point;
          })
        );

        if (!isMounted) return;

        const validPoints = results.filter(Boolean) as Array<{
          id: string;
          lat: number;
          lng: number;
          label: string;
        }>;

        console.log("Map points geocoded:", validPoints.length);
        setMapPoints(validPoints);
      } catch (error) {
        console.error("Geocoding error:", error);
        if (!isMounted) return;
        setMapPoints([]);
      }
    };

    fetchLocations();

    return () => {
      isMounted = false;
    };
  }, [shippingLocations]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 rounded-lg border border-neutral-200 shadow-lg">
          <p className="text-xs font-medium text-neutral-900">{payload[0].payload.date}</p>
          <p className="text-sm font-semibold text-neutral-900 mt-1">
            ${payload[0].value.toFixed(2)}
          </p>
          <p className="text-xs text-neutral-500">
            {payload[0].payload.orders} {payload[0].payload.orders === 1 ? 'order' : 'orders'}
          </p>
        </div>
      );
    }
    return null;
  };

  const StatusColors: Record<string, string> = {
    Paid: "#10b981",
    Pending: "#f59e0b",
    Shipped: "#3b82f6",
    Refunded: "#ef4444",
    Cancelled: "#6b7280",
    "Partially refunded": "#f97316",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <Spinner size="lg" color="default" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mb-2">
            Dashboard
          </h1>
          <p className="text-sm text-neutral-500">Track your sales and performance</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="relative">
            <Select
              selectedKey={selectedStore}
              onSelectionChange={(key) => setSelectedStore(key as string)}
            >
              <Label className="text-xs font-medium text-neutral-700 mb-1.5">Store</Label>
              <Select.Trigger className="min-w-[180px] h-9 text-sm bg-white border border-neutral-200 rounded-lg px-3 hover:border-neutral-300 transition-colors">
                <Select.Value />
                <IoChevronDown size={16} className="text-neutral-400" />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="all">
                    <Label>All stores</Label>
                  </ListBox.Item>
                  {stores.map((store) => (
                    <ListBox.Item key={store.id} id={store.id}>
                      <Label>{store.name}</Label>
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <div className="relative">
            <Select
              selectedKey={dateRange}
              onSelectionChange={(key) => setDateRange(key as string)}
            >
              <Label className="text-xs font-medium text-neutral-700 mb-1.5">Period</Label>
              <Select.Trigger className="min-w-[180px] h-9 text-sm bg-white border border-neutral-200 rounded-lg px-3 hover:border-neutral-300 transition-colors">
                <Select.Value />
                <IoChevronDown size={16} className="text-neutral-400" />
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
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <IoCashOutline className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Revenue
              </p>
              <p className="text-2xl font-semibold text-neutral-900">
                ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <IoCartOutline className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Orders
              </p>
              <p className="text-2xl font-semibold text-neutral-900">{totalOrders}</p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                <IoTrendingUpOutline className="w-5 h-5 text-violet-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Avg order
              </p>
              <p className="text-2xl font-semibold text-neutral-900">
                ${avgOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <IoStorefrontOutline className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Platform fees
              </p>
              <p className="text-2xl font-semibold text-neutral-900">
                ${platformRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 rounded-xl border border-neutral-200 bg-white p-6">
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-neutral-900">Revenue</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Daily revenue over time</p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="0" 
                  stroke="#f5f5f5" 
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="#a3a3a3"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />
                <YAxis
                  stroke="#a3a3a3"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dx={-8}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e5e5', strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Order Status */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-neutral-900">Order status</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Breakdown by status</p>
            </div>
            <div className="space-y-4">
              {statusChartData.map((status) => (
                <div key={status.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: StatusColors[status.name] || '#6b7280' }}
                      />
                      <span className="text-xs font-medium text-neutral-700">
                        {status.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500">{status.value}</span>
                      <span className="text-xs font-medium text-neutral-900">
                        {status.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${status.percentage}%`,
                        backgroundColor: StatusColors[status.name] || '#6b7280',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 mb-6">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-neutral-900">Top products</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Best selling items by revenue</p>
          </div>
          
          {topProductsData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-neutral-500">No product data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topProductsData.map((product: any, index: number) => {
                const maxRevenue = Math.max(...topProductsData.map((p: any) => p.revenue));
                const percentage = (product.revenue / maxRevenue) * 100;
                
                return (
                  <div key={product.name}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-neutral-200">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-semibold text-neutral-400">
                              {index + 1}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-neutral-900 truncate">
                          {product.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                        <span className="text-xs text-neutral-500">
                          {product.sales} {product.sales === 1 ? 'sale' : 'sales'}
                        </span>
                        <span className="text-sm font-semibold text-neutral-900 min-w-[80px] text-right">
                          ${product.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Shipping Heatmap */}
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <div className="p-6 border-b border-neutral-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Shipping heatmap</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Geographic distribution of orders
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <IoLocationOutline size={14} />
                <span>{shippingLocations.length} locations</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3">
            {/* Map */}
            <div className="lg:col-span-2 h-80 bg-neutral-50">
              {mapPoints.length > 0 ? (
                <Map
                  initialViewState={{
                    longitude: -98.5795,
                    latitude: 39.8283,
                    zoom: 3,
                  }}
                  style={{ width: "100%", height: "100%" }}
                  mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
                  attributionControl={false}
                >
                  <Source
                    id="shipping-points"
                    type="geojson"
                    data={{
                      type: "FeatureCollection",
                      features: mapPoints.map((point) => ({
                        type: "Feature",
                        geometry: {
                          type: "Point",
                          coordinates: [point.lng, point.lat],
                        },
                        properties: {
                          label: point.label,
                        },
                      })),
                    }}
                  >
                    <Layer
                      id="shipping-heatmap"
                      type="heatmap"
                      paint={{
                        "heatmap-weight": 1,
                        "heatmap-intensity": 1.5,
                        "heatmap-radius": 40,
                        "heatmap-opacity": 0.7,
                        "heatmap-color": [
                          "interpolate",
                          ["linear"],
                          ["heatmap-density"],
                          0,
                          "rgba(59, 130, 246, 0)",
                          0.2,
                          "rgba(59, 130, 246, 0.3)",
                          0.4,
                          "rgba(16, 185, 129, 0.5)",
                          0.6,
                          "rgba(16, 185, 129, 0.7)",
                          0.8,
                          "rgba(5, 150, 105, 0.85)",
                          1,
                          "rgba(4, 120, 87, 1)",
                        ],
                      }}
                    />
                    <Layer
                      id="shipping-points"
                      type="circle"
                      minzoom={5}
                      paint={{
                        "circle-radius": 5,
                        "circle-color": "#10b981",
                        "circle-stroke-color": "#ffffff",
                        "circle-stroke-width": 2,
                        "circle-opacity": 0.9,
                      }}
                    />
                  </Source>
                </Map>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <IoLocationOutline size={32} className="text-neutral-300 mx-auto mb-2" />
                    <p className="text-sm text-neutral-500">No shipping data yet</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Complete orders will appear on the map
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Location Breakdown */}
            <div className="p-6 bg-neutral-50 border-l border-neutral-100">
              <h4 className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-4">
                Top locations
              </h4>
              <div className="space-y-3">
                {locationCounts.length === 0 ? (
                  <p className="text-sm text-neutral-500">No data</p>
                ) : (
                  locationCounts.map((loc, index) => (
                    <div key={loc.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xs font-medium text-neutral-400">
                            {index + 1}
                          </span>
                          <span className="text-xs text-neutral-700 truncate">
                            {loc.label}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-neutral-900">
                          {loc.count}
                        </span>
                      </div>
                      <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                          style={{
                            width: `${Math.min(100, (loc.count / locationCounts[0].count) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}