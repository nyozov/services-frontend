import Nav from "../components/Nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <div className="flex">
        <main className="flex-1 ">{children}</main>
      </div>
    </>
  );
}
