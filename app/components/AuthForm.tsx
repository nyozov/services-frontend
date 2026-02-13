"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import {
  Button,
  Form,
  TextField,
  Label,
  Input,
  FieldError,
  Description,
  InputOTP,
  Link,
} from "@heroui/react";

type AuthMode = "sign-in" | "sign-up";

export default function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUserData, setPendingUserData] = useState<{
    email: string;
    name?: string;
  } | null>(null);

  const { signIn, setActive: setActiveSignIn } = useSignIn();
  const { signUp, setActive: setActiveSignUp } = useSignUp();

  /* ------------------ DB Sync ------------------ */ 
  const syncUserToDatabase = async (
    clerkUserId: string,
    email: string,
    name?: string
  ) => {
    const res = await fetch("http://localhost:3000/api/users/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clerkUserId, email, name }),
    });

    if (!res.ok) throw new Error("Failed to sync user");
  };

  /* ------------------ Google OAuth ------------------ */
  const signInWithGoogle = async () => {
    if (!signIn) return;

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sign-in/sso-callback", // temporary Clerk callback
        redirectUrlComplete: "/dashboard",
      });
    } catch (err: any) {
      console.error("Google OAuth error:", err);
      setError(err.message || "Google sign-in failed");
    }
  };

  /* ------------------ OTP Verification ------------------ */
  const handleVerification = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!signUp) throw new Error("SignUp not initialized");

      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (result.status === "complete") {
        if (!result.createdSessionId || !result.createdUserId)
          throw new Error("Session or User ID missing");

        await setActiveSignUp({ session: result.createdSessionId });

        // Sync user to DB
        if (pendingUserData) {
          await syncUserToDatabase(
            result.createdUserId,
            pendingUserData.email,
            pendingUserData.name
          );
        }

        setPendingUserData(null);
        setVerificationCode("");
        setVerificationStep(false);
        router.push("/dashboard");
      } else {
        setError("Verification incomplete, please try again.");
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      setError(
        err.errors?.[0]?.longMessage ||
          err.errors?.[0]?.message ||
          err.message ||
          "Verification failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resendCode = async () => {
    if (!signUp || !pendingUserData) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    } catch (err) {
      console.error("Resend OTP error:", err);
    }
  };

  /* ------------------ Email/Password Auth ------------------ */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    try {
      if (mode === "sign-in") {
        const result = await signIn?.create({ identifier: email, password });

        if (result?.status === "complete") {
          await setActiveSignIn({ session: result.createdSessionId });
          router.push("/dashboard");
        }
      } else {
        const result = await signUp?.create({
          emailAddress: email,
          password,
          firstName: name?.split(" ")[0],
          lastName: name?.split(" ").slice(1).join(" "),
        });

        if (result?.status === "complete") {
          await setActiveSignUp({ session: result.createdSessionId });
          await syncUserToDatabase(result.createdUserId!, email, name);
          router.push("/dashboard");
        } else if (result?.unverifiedFields?.includes("email_address")) {
          // Send OTP
          await signUp?.prepareEmailAddressVerification({ strategy: "email_code" });
          setPendingUserData({ email, name });
          setVerificationStep(true);
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(
        err.errors?.[0]?.longMessage ||
          err.errors?.[0]?.message ||
          err.message ||
          "Authentication failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------ UI ------------------ */
  return (
    <div className="w-full max-w-[420px] rounded-2xl">
      <h1 className="mb-2 text-center text-2xl font-semibold">
        {verificationStep
          ? "Verify your email"
          : mode === "sign-in"
          ? "Welcome back"
          : "Create your account"}
      </h1>

      {!verificationStep && (
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {mode === "sign-in" ? "Sign in to continue" : "Start building in minutes"}
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* ---------- Google OAuth ---------- */}
      {!verificationStep && (
        <>
          <Button variant="tertiary" className="mb-4 w-full gap-2" onPress={signInWithGoogle}>
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      {/* ---------- OTP Form ---------- */}
      {verificationStep ? (
        <Form onSubmit={handleVerification} className="space-y-4 flex flex-col justify-center items-center">
          <InputOTP
            maxLength={6}
            value={verificationCode}
            onChange={setVerificationCode}
          >
            <InputOTP.Group>
              <InputOTP.Slot index={0} />
              <InputOTP.Slot index={1} />
              <InputOTP.Slot index={2} />
            </InputOTP.Group>
            <InputOTP.Separator />
            <InputOTP.Group>
              <InputOTP.Slot index={3} />
              <InputOTP.Slot index={4} />
              <InputOTP.Slot index={5} />
            </InputOTP.Group>
          </InputOTP>

          <Button
            type="submit"
            className="w-full"
            isDisabled={verificationCode.length !== 6 || isLoading}
          >
            Verify email
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Didn’t get a code?{" "}
            <button type="button" onClick={resendCode} className="font-medium underline">
              Resend
            </button>
          </p>
        </Form>
      ) : (
        /* ---------- Email / Password Form ---------- */
        <Form onSubmit={handleSubmit} className="space-y-4">
          {mode === "sign-up" && (
            <TextField isRequired name="name">
              <Label>Full name</Label>
              <Input />
              <FieldError />
            </TextField>
          )}

          <TextField isRequired name="email" type="email">
            <Label>Email</Label>
            <Input />
            <FieldError />
          </TextField>

          <TextField isRequired name="password" type="password">
            <Label>Password</Label>
            <Input />
            {mode === "sign-up" && (
              <Description>At least 8 characters, 1 uppercase, 1 number</Description>
            )}
            <FieldError />
          </TextField>

          <Button type="submit" className="w-full" isDisabled={isLoading}>
            {mode === "sign-in" ? "Sign in" : "Create account"}
          </Button>
        </Form>
      )}

      {!verificationStep && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "sign-in" ? (
            <>
              Don’t have an account? <Link className="text-blue-400" href="/sign-up">Sign up</Link>
            </>
          ) : (
            <>
              Already have an account? <Link className="text-blue-400" href="/sign-in">Sign in</Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}

/* ------------------ Google Icon ------------------ */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.7 1.22 9.18 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.6 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.1 24.5c0-1.64-.15-3.21-.43-4.73H24v9.03h12.38c-.53 2.9-2.17 5.36-4.63 7.02l7.08 5.49C42.92 37.36 46.1 31.4 46.1 24.5z"/>
      <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.03 24.03 0 0 0 0 21.56l7.98-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.92-2.13 15.9-5.81l-7.08-5.49c-1.97 1.32-4.49 2.1-8.82 2.1-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.6 48 24 48z"/>
    </svg>
  );
}
