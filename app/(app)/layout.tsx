import Sidebar from "@/components/Sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 min-h-screen pt-16 md:pt-8">
        {children}
      </main>
    </div>
  );
}
