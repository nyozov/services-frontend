"use client";

import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Card, Spinner, Button } from "@heroui/react";
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
} from "@stripe/react-connect-js";
import { loadConnectAndInitialize } from "@stripe/connect-js";

export default function ConnectOnboardingPage() {
  const { getToken } = useAuth();
  const router = useRouter();

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

  const connectInstance = useMemo(() => {
    if (!publishableKey) return null;

    return loadConnectAndInitialize({
      publishableKey,
      fetchClientSecret: async () => {
        const token = await getToken();
        if (!token) {
          throw new Error("Not authenticated");
        }

        const response = await fetch(
          `${apiBase}/stripe/connect/account-session`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create account session");
        }

        const data = await response.json();
        return data.clientSecret;
      },
      appearance: {
        variables: {
          colorPrimary: "#3b82f6",
          colorText: "#111827",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        },
      },
    });
  }, [publishableKey, apiBase, getToken]);

  if (!publishableKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20 px-6">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Stripe key missing
          </h1>
          <p className="text-sm text-gray-600">
            Set <span className="font-semibold">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</span> to
            enable onboarding.
          </p>
          <Button className="mt-4" variant="primary" onPress={() => router.push("/stores")}>
            Back to stores
          </Button>
        </Card>
      </div>
    );
  }

  if (!connectInstance) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20 px-6">
        <div className="flex items-center gap-3 text-gray-600">
          <Spinner size="sm" />
          Loading onboarding...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Set up payouts
            </h1>
            <p className="text-sm text-gray-600">
              Complete Stripe onboarding to start receiving payments.
            </p>
          </div>
          <Button variant="ghost" onPress={() => router.push("/stores")}>
            Exit
          </Button>
        </div>

          <ConnectComponentsProvider connectInstance={connectInstance}>
            <ConnectAccountOnboarding
              onExit={() => router.push("/stores?stripe=success")}
            />
          </ConnectComponentsProvider>
      </div>
    </div>
  );
}
