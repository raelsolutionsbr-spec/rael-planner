"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/empresas", label: "Empresas", icon: "🏢" },
  { href: "/clientes", label: "CRM / Clientes", icon: "🤝" },
  { href: "/financeiro", label: "Financeiro", icon: "💰" },
  { href: "/rotina", label: "Rotina / Tarefas", icon: "✅" },
  { href: "/calendario", label: "Calendário", icon: "📅" },
  { href: "/investimentos", label: "Investimentos", icon: "📈" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-[var(--azul-painel)] border-r border-[rgba(0,200,255,0.15)] flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-[rgba(0,200,255,0.1)]">
        <h1 className="text-xl font-bold bg-gradient-to-r from-[var(--azul-neon)] to-[var(--laranja-vibrante)] bg-clip-text text-transparent">
          Rael Planner
        </h1>
        <p className="text-xs text-[var(--texto-secundario)] mt-1">
          Rael Solutions
        </p>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto scrollbar-tech">
        {menuItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-all ${
                active
                  ? "bg-[rgba(0,200,255,0.1)] text-[var(--azul-neon)] border-r-2 border-[var(--azul-neon)]"
                  : "text-[var(--texto-secundario)] hover:bg-[rgba(255,255,255,0.03)] hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[rgba(0,200,255,0.1)] text-xs text-[var(--texto-secundario)]">
        v1.0 · Rael Solutions
      </div>
    </aside>
  );
}
