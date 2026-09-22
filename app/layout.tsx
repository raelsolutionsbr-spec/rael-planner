import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
