"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Empresa = { id: string; nome: string; cor_tema: string };

type Cliente = {
  id: string;
  empresa_id: string;
  nome: string;
  telefone: string;
  email: string;
  status: string;
  valor_contrato: number;
  ultima_interacao: string;
  proximo_followup: string;
  observacoes: string;
};

const STATUS_CONFIG: Record<string, { label: string; cor: string }> = {
  lead: { label: "Lead", cor: "#94a3b8" },
  negociacao: { label: "Negociação", cor: "#f59e0b" },
  ativo: { label: "Ativo", cor: "#22c55e" },
  inativo: { label: "Inativo", cor: "#ef4444" },
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEmpresa, setFiltroEmpresa] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [editando, setEditando] = useState<Cliente | null>(null);

  const [form, setForm] = useState({
    empresa_id: "",
    nome: "",
    telefone: "",
    email: "",
    status: "lead",
    valor_contrato: "", // 🔧 ALTERADO: era 0, agora string vazia
    ultima_interacao: new Date().toISOString().slice(0, 10),
    proximo_followup: "",
    observacoes: "",
  });

  async function carregarDados() {
    setLoading(true);
    const { data: emp } = await supabase.from("empresas").select("id, nome, cor_tema").eq("ativa", true);
    const { data: cli } = await supabase.from("clientes").select("*").order("created_at", { ascending: false });

    setEmpresas(emp || []);
    setClientes(cli || []);
    if (emp && emp.length > 0 && !form.empresa_id) {
      setForm((f) => ({ ...f, empresa_id: emp[0].id }));
    }
    setLoading(false);
  }

  useEffect(() => {
    carregarDados();
  }, []);

  function resetForm() {
    setForm({
      empresa_id: empresas[0]?.id || "",
      nome: "",
      telefone: "",
      email: "",
      status: "lead",
      valor_contrato: "", // 🔧 ALTERADO
      ultima_interacao: new Date().toISOString().slice(0, 10),
      proximo_followup: "",
      observacoes: "",
    });
    setEditando(null);
  }

  async function salvarCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return alert("Digite o nome do cliente.");
    if (!form.empresa_id) return alert("Cadastre uma empresa primeiro.");

    // 🔧 ALTERADO: conversão de valor_contrato de string (com vírgula) para número
    const payload = {
      ...form,
      valor_contrato: parseFloat(String(form.valor_contrato).replace(",", ".")) || 0,
      proximo_followup: form.proximo_followup || null,
    };

    if (editando) {
      const { error } = await supabase.from("clientes").update(payload).eq("id", editando.id);
      if (error) return alert("Erro: " + error.message);
    } else {
      const { error } = await supabase.from("clientes").insert([payload]);
      if (error) return alert("Erro: " + error.message);
    }

    resetForm();
    carregarDados();
  }

  function iniciarEdicao(c: Cliente) {
    setEditando(c);
    setForm({
      empresa_id: c.empresa_id,
      nome: c.nome,
      telefone: c.telefone || "",
      email: c.email || "",
      status: c.status,
      valor_contrato: String(c.valor_contrato ?? ""), // 🔧 ALTERADO: number -> string para exibir no input
      ultima_interacao: c.ultima_interacao?.slice(0, 10) || "",
      proximo_followup: c.proximo_followup?.slice(0, 10) || "",
      observacoes: c.observacoes || "",
    });
  }

  async function excluirCliente(id: string) {
    if (!confirm("Excluir este cliente?")) return;
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) return alert("Erro: " + error.message);
    carregarDados();
  }

  async function mudarStatus(c: Cliente, novoStatus: string) {
    await supabase.from("clientes").update({ status: novoStatus }).eq("id", c.id);
    carregarDados();
  }

  function nomeEmpresa(id: string) {
    return empresas.find((e) => e.id === id)?.nome || "—";
  }

  function corEmpresa(id: string) {
    return empresas.find((e) => e.id === id)?.cor_tema || "#00c8ff";
  }

  function diasSemFollowup(data: string) {
    if (!data) return 0;
    const diff = (new Date().getTime() - new Date(data).getTime()) / (1000 * 60 * 60 * 24);
    return Math.floor(diff);
  }

  const clientesFiltrados = clientes.filter((c) => {
    const passaEmpresa = filtroEmpresa === "todas" || c.empresa_id === filtroEmpresa;
    const passaStatus = filtroStatus === "todos" || c.status === filtroStatus;
    return passaEmpresa && passaStatus;
  });

  // Funil por status
  const funil = ["lead", "negociacao", "ativo", "inativo"].map((s) => ({
    status: s,
    total: clientesFiltrados.filter((c) => c.status === s).length,
  }));

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">CRM — Clientes</h1>
      <p className="text-[var(--texto-secundario)] mb-6">
        Gerencie clientes de todas as empresas em um só lugar
      </p>

      {/* FUNIL RESUMO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {funil.map((f) => (
          <div key={f.status} className="card-tech p-4" style={{ borderLeft: `3px solid ${STATUS_CONFIG[f.status].cor}` }}>
            <p className="text-2xl font-bold">{f.total}</p>
            <p className="text-sm text-[var(--texto-secundario)]">{STATUS_CONFIG[f.status].label}</p>
          </div>
        ))}
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)}
          className="bg-[var(--azul-painel)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm">
          <option value="todas">Todas as empresas</option>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>

        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
          className="bg-[var(--azul-painel)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm">
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* FORMULÁRIO */}
      <form onSubmit={salvarCliente} className="card-tech p-6 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Empresa</label>
          <select value={form.empresa_id} onChange={(e) => setForm({ ...form, empresa_id: e.target.value })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm">
            {empresas.length === 0 && <option value="">Cadastre uma empresa primeiro</option>}
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Nome do cliente</label>
          <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex: João Silva"
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Telefone</label>
          <input type="text" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            placeholder="(11) 99999-9999"
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">E-mail</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Valor contrato (R$)</label>
          {/* 🔧 ALTERADO: input estava quebrado (JSX inválido). Corrigido abaixo */}
          <input
            type="text"
            inputMode="decimal"
            value={form.valor_contrato}
            onChange={(e) => setForm({ ...form, valor_contrato: e.target.value.replace(/[^0-9,]/g, "") })}
            placeholder="0,00"
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Última interação</label>
          <input type="date" value={form.ultima_interacao}
            onChange={(e) => setForm({ ...form, ultima_interacao: e.target.value })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Próximo follow-up</label>
          <input type="date" value={form.proximo_followup}
            onChange={(e) => setForm({ ...form, proximo_followup: e.target.value })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />
        </div>

        <div className="md:col-span-4">
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Observações</label>
          <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            rows={2}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />
        </div>

        <div className="md:col-span-4 flex gap-3">
          <button type="submit" className="gradiente-logo px-5 py-2 rounded-lg text-sm font-semibold text-[var(--azul-escuro)] hover:opacity-90 transition">
            {editando ? "Salvar alterações" : "+ Adicionar cliente"}
          </button>
          {editando && (
            <button type="button" onClick={resetForm} className="px-5 py-2 rounded-lg text-sm border border-[rgba(255,255,255,0.15)] text-[var(--texto-secundario)] hover:text-white transition">
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* LISTA */}
      {loading ? (
        <p className="text-[var(--texto-secundario)]">Carregando...</p>
      ) : clientesFiltrados.length === 0 ? (
        <p className="text-[var(--texto-secundario)]">Nenhum cliente encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientesFiltrados.map((c) => {
            const dias = diasSemFollowup(c.ultima_interacao);
            const frio = dias > 15;
            return (
              <div key={c.id} className="card-tech p-5" style={{ borderLeft: `3px solid ${corEmpresa(c.empresa_id)}` }}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{c.nome}</h3>
                    <span className="text-xs text-[var(--texto-secundario)]">{nomeEmpresa(c.empresa_id)}</span>
                  </div>
                  <select value={c.status} onChange={(e) => mudarStatus(c, e.target.value)}
                    className="text-xs px-2 py-1 rounded-full border-none"
                    style={{ background: `${STATUS_CONFIG[c.status].cor}22`, color: STATUS_CONFIG[c.status].cor }}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>

                {c.telefone && <p className="text-sm text-[var(--texto-secundario)]">📞 {c.telefone}</p>}
                {c.email && <p className="text-sm text-[var(--texto-secundario)]">✉️ {c.email}</p>}

                <p className="text-sm mt-2">
                  Contrato: <span className="text-white">R$ {Number(c.valor_contrato || 0).toLocaleString("pt-BR")}</span>
                </p>
                {/* 🔧 ALTERADO: Number() protege contra valor não numérico */}

                {frio && (
                  <p className="text-xs mt-2 px-2 py-1 rounded-lg bg-[rgba(239,68,68,0.15)] text-[var(--vermelho-alerta)] inline-block">
                    ⚠️ Cliente frio — {dias} dias sem interação
                  </p>
                )}

                {c.observacoes && (
                  <p className="text-xs text-[var(--texto-secundario)] mt-2 italic">"{c.observacoes}"</p>
                )}

                <div className="flex gap-2 mt-4">
                  <button onClick={() => iniciarEdicao(c)} className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(0,200,255,0.3)] text-[var(--azul-neon)] hover:bg-[rgba(0,200,255,0.1)] transition">
                    Editar
                  </button>
                  <button onClick={() => excluirCliente(c.id)} className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(239,68,68,0.3)] text-[var(--vermelho-alerta)] hover:bg-[rgba(239,68,68,0.1)] transition">
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
