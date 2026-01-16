"use client";

import { useState } from "react";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import {
  Button,
  Modal,
  Form,
  TextField,
  Label,
  Input,
  FieldError,
  Description,
  InputOTP,
  Link,
} from "@heroui/react";

export default function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
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

  const syncUserToDatabase = async (clerkUserId: string, email: string, name?: string) => {
    try {
      const response = await fetch('http://localhost:3000/api/users/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkUserId,
          email,
          name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync user to database');
      }

      return await response.json();
    } catch (error) {
      console.error('Error syncing user:', error);
      throw error;
    }
  };

  const handleVerification = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signUp?.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      console.log('Verification result:', result);

      if (result?.status === "complete") {
        await setActiveSignUp({ session: result.createdSessionId });
        
        // Sync user to your database
        if (result.createdUserId && pendingUserData) {
          await syncUserToDatabase(
            result.createdUserId, 
            pendingUserData.email, 
            pendingUserData.name
          );
        }
        
        setIsOpen(false);
        setVerificationStep(false);
        setVerificationCode("");
        setPendingUserData(null);
      } else {
        setError('Verification incomplete. Please try again.');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      const errorMessage = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Verification failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    try {
      if (authMode === "sign-in") {
        // Sign in with Clerk
        const result = await signIn?.create({
          identifier: email,
          password,
        });

        if (result?.status === "complete") {
          await setActiveSignIn({ session: result.createdSessionId });
          setIsOpen(false);
        }
      } else {
        // Sign up with Clerk
        const result = await signUp?.create({
          emailAddress: email,
          password,
          firstName: name?.split(' ')[0] || '',
          lastName: name?.split(' ').slice(1).join(' ') || '',
        });

        if (result?.status === "complete") {
          await setActiveSignUp({ session: result.createdSessionId });
          
          // Sync user to your database
          if (result.createdUserId) {
            await syncUserToDatabase(result.createdUserId, email, name);
          }
          
          setIsOpen(false);
        } else if (result?.unverifiedFields?.includes("email_address")) {
          // Email verification required
          await signUp?.prepareEmailAddressVerification({ strategy: "email_code" });
          setPendingUserData({ email, name });
          setVerificationStep(true);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.errors?.[0]?.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in");
    setError(null);
    setVerificationStep(false);
    setVerificationCode("");
  };

  const resendCode = async () => {
    try {
      await signUp?.prepareEmailAddressVerification({ strategy: "email_code" });
      setError(null);
      alert("Verification code resent!");
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Failed to resend code');
    }
  };

  return (
    <>
      <Button variant="primary" onPress={() => setIsOpen(true)}>
        Sign in
      </Button>

      <Modal isOpen={isOpen} onOpenChange={setIsOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[400px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>
                  {verificationStep 
                    ? "Verify Your Email" 
                    : authMode === "sign-in" ? "Welcome Back" : "Create Account"
                  }
                </Modal.Heading>
              </Modal.Header>
              
              <Modal.Body>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                    {error}
                  </div>
                )}

                {verificationStep ? (
                  <Form className="flex flex-col gap-4" onSubmit={handleVerification}>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-1">
                        <Label>Verify account</Label>
                        <p className="text-sm text-muted">
                          We've sent a code to {pendingUserData?.email}
                        </p>
                      </div>
                      
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

                      <div className="flex items-center gap-[5px] px-1 pt-1">
                        <p className="text-sm text-muted">Didn't receive a code?</p>
                        <Link 
                          className="text-foreground cursor-pointer" 
                          underline="always"
                          onPress={resendCode}
                        >
                          Resend
                        </Link>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      variant="primary" 
                      className="w-full"
                      isDisabled={isLoading || verificationCode.length !== 6}
                    >
                      {isLoading ? "Verifying..." : "Verify Email"}
                    </Button>
                  </Form>
                ) : (
                  <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                    {authMode === "sign-up" && (
                      <TextField isRequired name="name">
                        <Label>Full Name</Label>
                        <Input placeholder="John Doe" />
                        <FieldError />
                      </TextField>
                    )}

                    <TextField
                      isRequired
                      name="email"
                      type="email"
                      validate={(value) => {
                        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
                          return "Please enter a valid email address";
                        }
                        return null;
                      }}
                    >
                      <Label>Email</Label>
                      <Input placeholder="john@example.com" />
                      <FieldError />
                    </TextField>

                    <TextField
                      isRequired
                      minLength={8}
                      name="password"
                      type="password"
                      validate={(value) => {
                        if (value.length < 8) {
                          return "Password must be at least 8 characters";
                        }
                        if (!/[A-Z]/.test(value)) {
                          return "Password must contain at least one uppercase letter";
                        }
                        if (!/[0-9]/.test(value)) {
                          return "Password must contain at least one number";
                        }
                        return null;
                      }}
                    >
                      <Label>Password</Label>
                      <Input placeholder="Enter your password" />
                      {authMode === "sign-up" && (
                        <Description>
                          Must be at least 8 characters with 1 uppercase and 1 number
                        </Description>
                      )}
                      <FieldError />
                    </TextField>

                    {authMode === "sign-up" && (
                      <TextField
                        isRequired
                        name="confirmPassword"
                        type="password"
                        validate={(value) => {
                          const password = (document.querySelector('input[name="password"]') as HTMLInputElement)?.value;
                          if (value !== password) {
                            return "Passwords do not match";
                          }
                          return null;
                        }}
                      >
                        <Label>Confirm Password</Label>
                        <Input placeholder="Confirm your password" />
                        <FieldError />
                      </TextField>
                    )}

                    <Button 
                      type="submit" 
                      variant="primary" 
                      className="w-full"
                      isDisabled={isLoading}
                    >
                      {isLoading ? "Loading..." : authMode === "sign-in" ? "Sign In" : "Sign Up"}
                    </Button>
                  </Form>
                )}

                {!verificationStep && (
                  <div className="mt-4 text-center text-sm">
                    {authMode === "sign-in" ? (
                      <p>
                        Don't have an account?{" "}
                        <button
                          type="button"
                          onClick={toggleAuthMode}
                          className="text-primary hover:underline font-medium"
                          disabled={isLoading}
                        >
                          Sign up
                        </button>
                      </p>
                    ) : (
                      <p>
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={toggleAuthMode}
                          className="text-primary hover:underline font-medium"
                          disabled={isLoading}
                        >
                          Sign in
                        </button>
                      </p>
                    )}
                  </div>
                )}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}