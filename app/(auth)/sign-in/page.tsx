import AuthForm from "@/app/components/AuthForm";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <AuthForm mode="sign-in" />
    </div>
  );
}
