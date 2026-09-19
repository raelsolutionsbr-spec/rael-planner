import Link from "next/link";

const modulos = [
  { href: "/empresas", titulo: "Empresas", desc: "Gerencie suas 6 empresas + parceiras", cor: "#00c8ff", icon: "🏢" },
  { href: "/clientes", titulo: "CRM — Clientes", desc: "Funil de clientes e follow-ups", cor: "#ff6b35", icon: "🤝" },
  { href: "/financeiro", titulo: "Financeiro", desc: "Entradas, saídas e saldo por empresa", cor: "#22c55e", icon: "💰" },
  { href: "/rotina", titulo: "Rotina de Hoje", desc: "Tarefas do dia e alarmes", cor: "#f59e0b", icon: "✅" },
];

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Rael Planner</h1>
      <p className="text-[var(--texto-secundario)] mb-8">
        Painel de controle Rael Solutions
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {modulos.map((m) => (
          <Link key={m.href} href={m.href}>
            <div
              className="card-tech p-5 cursor-pointer h-full"
              style={{ borderLeft: `3px solid ${m.cor}` }}
            >
              <div className="text-2xl mb-2">{m.icon}</div>
              <h3 className="font-semibold mb-1">{m.titulo}</h3>
              <p className="text-sm text-[var(--texto-secundario)]">{m.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
