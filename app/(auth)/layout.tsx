export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-100 via-slate-50 to-indigo-100">
      {children}
    </div>
  );
}
