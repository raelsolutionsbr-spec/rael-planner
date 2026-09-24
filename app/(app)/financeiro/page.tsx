"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Empresa = { id: string; nome: string; cor_tema: string; meta_mensal: number };

type Lancamento = {
  id: string;
  origem: string;
  empresa_id: string | null;
  tipo: string;
  categoria: string;
  valor: number;
  data: string;
  recorrente: boolean;
  observacao: string;
};

const CATEGORIAS_ENTRADA = ["Venda", "Serviço prestado", "Comissão", "Salário", "Outros"];
const CATEGORIAS_SAIDA = ["Fixo", "Fornecedor", "Marketing", "Alimentação", "Transporte", "Impostos", "Outros"];

export default function FinanceiroPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Lancamento | null>(null);

  const [filtroOrigem, setFiltroOrigem] = useState("todas");
  const [filtroEmpresa, setFiltroEmpresa] = useState("todas");
  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const [form, setForm] = useState({
    origem: "pessoal",
    empresa_id: "",
    tipo: "entrada",
    categoria: "Outros",
    valor: 0,
    data: new Date().toISOString().slice(0, 10),
    recorrente: false,
    observacao: "",
  });

  async function carregarDados() {
    setLoading(true);
    const { data: emp } = await supabase.from("empresas").select("id, nome, cor_tema, meta_mensal").eq("ativa", true);
    const { data: lan } = await supabase.from("financeiro").select("*").order("data", { ascending: false });

    setEmpresas(emp || []);
    setLancamentos(lan || []);
    setLoading(false);
  }

  useEffect(() => {
    carregarDados();
  }, []);

  function resetForm() {
    setForm({
      origem: "pessoal",
      empresa_id: "",
      tipo: "entrada",
      categoria: "Outros",
      valor: 0,
      data: new Date().toISOString().slice(0, 10),
      recorrente: false,
      observacao: "",
    });
    setEditando(null);
  }

  async function salvarLancamento(e: React.FormEvent) {
    e.preventDefault();
    if (form.valor <= 0) return alert("Informe um valor válido.");
    if (form.origem === "empresarial" && !form.empresa_id) return alert("Selecione a empresa.");

    const payload = {
      ...form,
      empresa_id: form.origem === "empresarial" ? form.empresa_id : null,
    };

    if (editando) {
      const { error } = await supabase.from("financeiro").update(payload).eq("id", editando.id);
      if (error) return alert("Erro: " + error.message);
    } else {
      const { error } = await supabase.from("financeiro").insert([payload]);
      if (error) return alert("Erro: " + error.message);
    }

    resetForm();
    carregarDados();
  }

  function iniciarEdicao(l: Lancamento) {
    setEditando(l);
    setForm({
      origem: l.origem,
      empresa_id: l.empresa_id || "",
      tipo: l.tipo,
      categoria: l.categoria,
      valor: l.valor,
      data: l.data.slice(0, 10),
      recorrente: l.recorrente,
      observacao: l.observacao || "",
    });
  }

  async function excluirLancamento(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    const { error } = await supabase.from("financeiro").delete().eq("id", id);
    if (error) return alert("Erro: " + error.message);
    carregarDados();
  }

  function nomeEmpresa(id: string | null) {
    return empresas.find((e) => e.id === id)?.nome || "—";
  }

  // Filtros aplicados
  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((l) => {
      const mesLancamento = l.data.slice(0, 7);
      const passaMes = mesLancamento === filtroMes;
      const passaOrigem = filtroOrigem === "todas" || l.origem === filtroOrigem;
      const passaEmpresa = filtroEmpresa === "todas" || l.empresa_id === filtroEmpresa;
      return passaMes && passaOrigem && passaEmpresa;
    });
  }, [lancamentos, filtroMes, filtroOrigem, filtroEmpresa]);

  // Totais gerais do mês filtrado
  const totalEntradas = lancamentosFiltrados.filter((l) => l.tipo === "entrada").reduce((s, l) => s + l.valor, 0);
  const totalSaidas = lancamentosFiltrados.filter((l) => l.tipo === "saida").reduce((s, l) => s + l.valor, 0);
  const saldo = totalEntradas - totalSaidas;

  // Status do mês (verde/amarelo/vermelho)
  const percentualGasto = totalEntradas > 0 ? (totalSaidas / totalEntradas) * 100 : totalSaidas > 0 ? 100 : 0;
  let statusMes: { label: string; cor: string } = { label: "✅ Saudável", cor: "#22c55e" };
  if (saldo < 0) statusMes = { label: "⚠️ NO VERMELHO", cor: "#ef4444" };
  else if (percentualGasto > 70) statusMes = { label: "🔍 Margem baixa", cor: "#f59e0b" };

  // Saldo por empresa (dentro do mês filtrado, só lançamentos empresariais)
  const saldoPorEmpresa = empresas.map((emp) => {
    const lancsEmp = lancamentos.filter((l) => l.data.slice(0, 7) === filtroMes && l.empresa_id === emp.id);
    const entradas = lancsEmp.filter((l) => l.tipo === "entrada").reduce((s, l) => s + l.valor, 0);
    const saidas = lancsEmp.filter((l) => l.tipo === "saida").reduce((s, l) => s + l.valor, 0);
    const saldoEmp = entradas - saidas;
    const pctGasto = entradas > 0 ? (saidas / entradas) * 100 : saidas > 0 ? 100 : 0;

    let status = { label: "✅ Positivo", cor: "#22c55e" };
    if (saldoEmp < 0) status = { label: "⚠️ Vermelho", cor: "#ef4444" };
    else if (pctGasto > 70) status = { label: "🔍 Margem baixa", cor: "#f59e0b" };

    return { ...emp, entradas, saidas, saldoEmp, status, pctMeta: emp.meta_mensal > 0 ? (entradas / emp.meta_mensal) * 100 : 0 };
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Financeiro</h1>
      <p className="text-[var(--texto-secundario)] mb-6">
        Controle pessoal e empresarial, com alertas automáticos
      </p>

      {/* FILTRO DE MÊS */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <input type="month" value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)}
          className="bg-[var(--azul-painel)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />

        <select value={filtroOrigem} onChange={(e) => setFiltroOrigem(e.target.value)}
          className="bg-[var(--azul-painel)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm">
          <option value="todas">Todas as origens</option>
          <option value="pessoal">Pessoal</option>
          <option value="empresarial">Empresarial</option>
        </select>

        <select value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)}
          className="bg-[var(--azul-painel)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm">
          <option value="todas">Todas as empresas</option>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </div>

      {/* RESUMO GERAL DO MÊS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card-tech p-5">
          <p className="text-sm text-[var(--texto-secundario)]">Entradas</p>
          <p className="text-2xl font-bold text-[var(--verde-sucesso)]">
            R$ {totalEntradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card-tech p-5">
          <p className="text-sm text-[var(--texto-secundario)]">Saídas</p>
          <p className="text-2xl font-bold text-[var(--vermelho-alerta)]">
            R$ {totalSaidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card-tech p-5">
          <p className="text-sm text-[var(--texto-secundario)]">Saldo</p>
          <p className="text-2xl font-bold" style={{ color: saldo >= 0 ? "#22c55e" : "#ef4444" }}>
            R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card-tech p-5" style={{ borderLeft: `3px solid ${statusMes.cor}` }}>
          <p className="text-sm text-[var(--texto-secundario)]">Status do mês</p>
          <p className="text-lg font-bold" style={{ color: statusMes.cor }}>{statusMes.label}</p>
        </div>
      </div>

      {/* SALDO POR EMPRESA */}
      {filtroOrigem !== "pessoal" && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Saldo por empresa</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {saldoPorEmpresa.map((emp) => (
              <div key={emp.id} className="card-tech p-4" style={{ borderLeft: `3px solid ${emp.cor_tema}` }}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">{emp.nome}</h3>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: `${emp.status.cor}22`, color: emp.status.cor }}>
                    {emp.status.label}
                  </span>
                </div>
                <p className="text-sm text-[var(--texto-secundario)]">
                  Entradas: <span className="text-white">R$ {emp.entradas.toLocaleString("pt-BR")}</span>
                </p>
                <p className="text-sm text-[var(--texto-secundario)]">
                  Saídas: <span className="text-white">R$ {emp.saidas.toLocaleString("pt-BR")}</span>
                </p>
                <p className="text-sm mt-1">
                  Saldo: <span style={{ color: emp.saldoEmp >= 0 ? "#22c55e" : "#ef4444" }}>
                    R$ {emp.saldoEmp.toLocaleString("pt-BR")}
                  </span>
                </p>
                {emp.meta_mensal > 0 && (
                  <div className="mt-2">
                    <div className="w-full h-2 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
                      <div className="h-full gradiente-logo" style={{ width: `${Math.min(emp.pctMeta, 100)}%` }} />
                    </div>
                    <p className="text-xs text-[var(--texto-secundario)] mt-1">
                      {emp.pctMeta.toFixed(0)}% da meta (R$ {emp.meta_mensal.toLocaleString("pt-BR")})
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FORMULÁRIO */}
      <form onSubmit={salvarLancamento} className="card-tech p-6 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Origem</label>
          <select value={form.origem}
            onChange={(e) => setForm({ ...form, origem: e.target.value, empresa_id: "" })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm">
            <option value="pessoal">Pessoal</option>
            <option value="empresarial">Empresarial</option>
          </select>
        </div>

        {form.origem === "empresarial" && (
          <div>
            <label className="text-sm text-[var(--texto-secundario)] block mb-1">Empresa</label>
            <select value={form.empresa_id} onChange={(e) => setForm({ ...form, empresa_id: e.target.value })}
              className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm">
              <option value="">Selecione...</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Tipo</label>
          <select value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value, categoria: e.target.value === "entrada" ? CATEGORIAS_ENTRADA[0] : CATEGORIAS_SAIDA[0] })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm">
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Categoria</label>
          <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm">
            {(form.tipo === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Valor (R$)</label>
          <input type="text" inputMode="decimal" value={form.valor} ... />
            onChange={(e) => setForm({ ...form, valor: e.target.value.replace(/[^0-9,]/g, "") })
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Data</label>
          <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Observação</label>
          <input type="text" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-[var(--texto-secundario)]">
            <input type="checkbox" checked={form.recorrente}
              onChange={(e) => setForm({ ...form, recorrente: e.target.checked })} />
            Recorrente
          </label>
        </div>

        <div className="md:col-span-4 flex gap-3">
          <button type="submit" className="gradiente-logo px-5 py-2 rounded-lg text-sm font-semibold text-[var(--azul-escuro)] hover:opacity-90 transition">
            {editando ? "Salvar alterações" : "+ Adicionar lançamento"}
          </button>
          {editando && (
            <button type="button" onClick={resetForm} className="px-5 py-2 rounded-lg text-sm border border-[rgba(255,255,255,0.15)] text-[var(--texto-secundario)] hover:text-white transition">
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* LISTA DE LANÇAMENTOS */}
      {loading ? (
        <p className="text-[var(--texto-secundario)]">Carregando...</p>
      ) : lancamentosFiltrados.length === 0 ? (
        <p className="text-[var(--texto-secundario)]">Nenhum lançamento neste mês/filtro.</p>
      ) : (
        <div className="space-y-2">
          {lancamentosFiltrados.map((l) => (
            <div key={l.id} className="card-tech p-4 flex items-center gap-4"
              style={{ borderLeft: `3px solid ${l.tipo === "entrada" ? "#22c55e" : "#ef4444"}` }}>
              <div className="flex-1">
                <p className="font-medium">
                  {l.categoria} · {l.origem === "empresarial" ? nomeEmpresa(l.empresa_id) : "Pessoal"}
                  {l.recorrente && <span className="text-xs ml-2 text-[var(--azul-neon)]">🔁 recorrente</span>}
                </p>
                <p className="text-xs text-[var(--texto-secundario)]">
                  {new Date(l.data).toLocaleDateString("pt-BR")} {l.observacao && `· ${l.observacao}`}
                </p>
              </div>
              <p className="font-bold" style={{ color: l.tipo === "entrada" ? "#22c55e" : "#ef4444" }}>
                {l.tipo === "entrada" ? "+" : "-"} R$ {l.valor.toLocaleString("pt-BR")}
              </p>
              <button onClick={() => iniciarEdicao(l)} className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(0,200,255,0.3)] text-[var(--azul-neon)] hover:bg-[rgba(0,200,255,0.1)] transition">
                Editar
              </button>
              <button onClick={() => excluirLancamento(l.id)} className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(239,68,68,0.3)] text-[var(--vermelho-alerta)] hover:bg-[rgba(239,68,68,0.1)] transition">
                Excluir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
