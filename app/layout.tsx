import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "Rael Planner | Rael Solutions",
  description: "Sistema de gestão pessoal, financeira e empresarial",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="flex">
          <Sidebar />
          <main className="flex-1 ml-64 p-8 min-h-screen">{children}</main>
        </div>
      </body>
    </html>
  );
}
