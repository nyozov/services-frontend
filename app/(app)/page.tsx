import { Button } from "@heroui/react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-16 px-8 py-20 md:grid-cols-2">
        {/* Left content */}
        <div>
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
            Create, share, and sell
            <br />
            products effortlessly
          </h1>

          <ul className="mt-6 space-y-3 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span>
                <strong>Build your store.</strong> Add products and customize in
                minutes
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span>
                <strong>Share instantly.</strong> Send public links to customers
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span>
                <strong>Track orders.</strong> Dashboard gives you real-time
                updates
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span>
                <strong>Secure payments.</strong> Powered by Stripe with 5%
                transaction fee
              </span>
            </li>
          </ul>

          <div className="mt-8 flex items-center gap-4">
            <Link href="/sign-up" passHref>
              <Button variant="primary">Start your store. It's FREE!</Button>
            </Link>
            <span className="text-sm text-gray-500">
              No monthly fees. Just 5% per sale.
            </span>
          </div>
        </div>

        {/* Right visual placeholder */}
        <div className="relative">
          <div className="aspect-[4/3] w-full rounded-2xl border border-gray-200 bg-gray-50 shadow-sm" />
        </div>
      </main>
    </div>
  );
}
