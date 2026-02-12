"use client";

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 flex items-center justify-center px-6">
      <div className="text-center">
        <div className="relative mx-auto h-16 w-16">
          <div className="absolute inset-0 rounded-full border border-blue-100/80" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 border-r-purple-500 animate-spin" />
          <div className="absolute inset-2 rounded-full bg-white/90 shadow-sm" />
          <img
            src="/quickshoplogo.svg"
            alt="Quickshop"
            className="absolute inset-0 h-full w-full object-contain p-3"
          />
        </div>
        <div className="mt-5 text-base font-semibold text-gray-900 tracking-wide">
          Loading…
        </div>
        <div className="mt-2 text-sm text-gray-500">
          Getting everything ready.
        </div>
      </div>
    </div>
  );
}
