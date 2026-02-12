import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import {
  IoShieldCheckmarkOutline,
} from "react-icons/io5";
import GradientHeroButton from "../components/GradientHeroButton";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30">
      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-6 pt-16 pb-14 lg:px-8 lg:pt-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.1fr,0.9fr] lg:gap-16 items-center">
          <div className="space-y-8">
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-gray-900 lg:text-6xl">
              The storefront
              <br />
              <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 bg-clip-text text-transparent">
                built for sharing
              </span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Create a beautiful online store, add products, and share a single link.
              Everything you need to sell, without the bloat.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <SignedIn>
                <Link href="/stores">
                  <GradientHeroButton>Get started for free</GradientHeroButton>
                </Link>
              </SignedIn>
              <SignedOut>
                <Link href="/sign-in">
                  <GradientHeroButton>Get started for free</GradientHeroButton>
                </Link>
              </SignedOut>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <IoShieldCheckmarkOutline className="h-4 w-4 text-green-600" />
                Secure Stripe checkout
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
