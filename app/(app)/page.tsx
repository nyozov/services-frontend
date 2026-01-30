import { Button, Card } from "@heroui/react";
import Link from "next/link";
import { IoStorefrontOutline, IoRocketOutline, IoShieldCheckmarkOutline, IoTrendingUpOutline } from "react-icons/io5";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30">
      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left content */}
          <div className="space-y-8">
          

            <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-gray-900 lg:text-6xl">
              Sell anything,
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                share everywhere
              </span>
            </h1>

            <p className="text-xl text-gray-600 leading-relaxed">
              The simplest way to create your online store. No technical skills required. 
              Start selling in minutes, not days.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <IoStorefrontOutline className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Build in minutes</h3>
                  <p className="text-sm text-gray-600">Simple setup process</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <IoRocketOutline className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Share instantly</h3>
                  <p className="text-sm text-gray-600">One link to sell</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <IoShieldCheckmarkOutline className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Secure payments</h3>
                  <p className="text-sm text-gray-600">Powered by Stripe</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                  <IoTrendingUpOutline className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Track sales</h3>
                  <p className="text-sm text-gray-600">Real-time dashboard</p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/stores">
                <Button 
                  variant="primary" 
                  size="lg"
                  className="w-full sm:w-auto text-lg px-8 py-6 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-shadow"
                >
                  Start Selling Free →
                </Button>
              </Link>
              <div className="text-sm text-gray-500 sm:ml-2">
                <span className="font-semibold text-gray-700">Join 1,000+ sellers</span>
                <br />
                No credit card required
              </div>
            </div>
          </div>

          {/* Right visual - Modern store preview */}
          <div className="relative">
            {/* Floating cards mockup */}
            <div className="relative aspect-square w-full">
              {/* Background gradient blob */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-3xl blur-3xl"></div>
              
              {/* Main store card */}
              <Card className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 p-6 shadow-2xl rotate-[-2deg] hover:rotate-0 transition-transform">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500"></div>
                    <div>
                      <div className="h-3 w-24 bg-gray-200 rounded"></div>
                      <div className="h-2 w-16 bg-gray-100 rounded mt-2"></div>
                    </div>
                  </div>
                  <div className="h-32 w-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg"></div>
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-gray-200 rounded"></div>
                    <div className="h-3 w-3/4 bg-gray-100 rounded"></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="h-6 w-20 bg-blue-100 rounded"></div>
                    <div className="h-8 w-24 bg-blue-500 rounded-lg"></div>
                  </div>
                </div>
              </Card>

              {/* Floating notification */}
              <Card className="absolute top-1/3 -right-4 w-48 p-4 shadow-xl animate-bounce-slow">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-lg">✓</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 w-full bg-gray-200 rounded"></div>
                    <div className="h-2 w-3/4 bg-gray-100 rounded mt-1"></div>
                  </div>
                </div>
              </Card>

              {/* Stats card */}
              <Card className="absolute bottom-8 -left-4 w-40 p-3 shadow-lg">
                <div className="text-xs text-gray-500 mb-1">Total Sales</div>
                <div className="text-2xl font-bold text-gray-900">$2,847</div>
                <div className="text-xs text-green-600 mt-1">↑ 12% this week</div>
              </Card>
            </div>
          </div>
        </div>
      </main>

    

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Everything you need to sell online
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Simple, powerful tools for modern sellers
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <Card className="p-8 hover:shadow-xl transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-6">
              <IoStorefrontOutline className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Beautiful Storefronts
            </h3>
            <p className="text-gray-600">
              Create stunning product pages in minutes. No design skills needed.
            </p>
          </Card>

          <Card className="p-8 hover:shadow-xl transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center mb-6">
              <IoShieldCheckmarkOutline className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Secure Checkout
            </h3>
            <p className="text-gray-600">
              Enterprise-grade security powered by Stripe. Your customers are protected.
            </p>
          </Card>

          <Card className="p-8 hover:shadow-xl transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center mb-6">
              <IoTrendingUpOutline className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Real-Time Analytics
            </h3>
            <p className="text-gray-600">
              Track orders, revenue, and customer insights from your dashboard.
            </p>
          </Card>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <Card className="bg-gradient-to-br from-blue-600 to-purple-600 p-12 text-center text-white">
          <h2 className="text-3xl font-bold sm:text-4xl mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-xl opacity-90 mb-8">
            No monthly fees. No hidden costs. Just pay when you sell.
          </p>
          <div className="text-6xl font-bold mb-4">5%</div>
          <p className="text-xl mb-8">per transaction + Stripe fees</p>
          <Link href="/stores">
            <Button 
              variant="secondary"
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6"
            >
              Start Selling Free →
            </Button>
          </Link>
        </Card>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center lg:px-8">
        <h2 className="text-4xl font-bold text-gray-900 mb-6">
          Ready to start selling?
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          Join thousands of sellers who've made their first sale with us.
        </p>
        <Link href="/stores">
          <Button 
            variant="primary" 
            size="lg"
            className="text-lg px-8 py-6 shadow-lg shadow-blue-500/30"
          >
            Create Your Store Free →
          </Button>
        </Link>
      </section>
    </div>
  );
}