"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IoHomeOutline,
  IoReceiptOutline,
  IoStorefrontOutline,
  IoMailOutline,
} from "react-icons/io5";
import { useUser } from "@clerk/nextjs";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: IoHomeOutline },
  { name: "Inbox", href: "/inbox", icon: IoMailOutline },
  { name: "Orders", href: "/orders", icon: IoReceiptOutline },
  { name: "Stores", href: "/stores", icon: IoStorefrontOutline },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <aside className="w-64 min-h-screen border-r border-gray-200 bg-white p-4">
      <nav className="space-y-1">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link key={item.name} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "text-gray-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon size={20} />
                <span className="font-medium text-sm">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
