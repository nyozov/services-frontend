import Nav from "../components/Nav";
import Sidebar from "../components/Sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ">{children}</main>
      </div>
    </>
  );
}
