"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Investimento = {
  id: string;
  ativo: string;
  tipo: string;
  valor_aportado: number;
  valor_atual: number;
  data_aporte: string;
  observacao: string;
};

const TIPO_CONFIG: Record<string, { label: string; cor: string }> = {
  renda_fixa: { label: "Renda Fixa", cor: "#00c8ff" },
  acoes: { label: "Ações", cor: "#22c55e" },
  fundos: { label: "Fundos", cor: "#f59e0b" },
  cripto: { label: "Cripto", cor: "#a855f7" },
  tesouro: { label: "Tesouro Direto", cor: "#ff6b35" },
  outros: { label: "Outros", cor: "#94a3b8" },
};

export default function InvestimentosPage() {
  const [investimentos, setInvestimentos] = useState<Investimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Investimento | null>(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");

  const [form, setForm] = useState({
    ativo: "",
    tipo: "renda_fixa",
    valor_aportado: 0,
    valor_atual: 0,
    data_aporte: new Date().toISOString().slice(0, 10),
    observacao: "",
  });

  async function carregarDados() {
    setLoading(true);
    const { data } = await supabase.from("investimentos").select("*").order("data_aporte", { ascending: false });
    setInvestimentos(data || []);
    setLoading(false);
  }

  useEffect(() => {
    carregarDados();
  }, []);

  function resetForm() {
    setForm({
      ativo: "",
      tipo: "renda_fixa",
      valor_aportado: 0,
      valor_atual: 0,
      data_aporte: new Date().toISOString().slice(0, 10),
      observacao: "",
    });
    setEditando(null);
  }

  async function salvarInvestimento(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ativo.trim()) return alert("Digite o nome do ativo.");
    if (form.valor_aportado <= 0) return alert("Informe o valor aportado.");

    if (editando) {
      const { error } = await supabase.from("investimentos").update(form).eq("id", editando.id);
      if (error) return alert("Erro: " + error.message);
    } else {
      const { error } = await supabase.from("investimentos").insert([form]);
      if (error) return alert("Erro: " + error.message);
    }

    resetForm();
    carregarDados();
  }

  function iniciarEdicao(inv: Investimento) {
    setEditando(inv);
    setForm({
      ativo: inv.ativo,
      tipo: inv.tipo,
      valor_aportado: inv.valor_aportado,
      valor_atual: inv.valor_atual,
      data_aporte: inv.data_aporte.slice(0, 10),
      observacao: inv.observacao || "",
    });
  }

  async function excluirInvestimento(id: string) {
    if (!confirm("Excluir este investimento?")) return;
    const { error } = await supabase.from("investimentos").delete().eq("id", id);
    if (error) return alert("Erro: " + error.message);
    carregarDados();
  }

  const investimentosFiltrados = useMemo(() => {
    return investimentos.filter((i) => filtroTipo === "todos" || i.tipo === filtroTipo);
  }, [investimentos, filtroTipo]);

  // Totais gerais
  const totalAportado = investimentosFiltrados.reduce((s, i) => s + i.valor_aportado, 0);
  const totalAtual = investimentosFiltrados.reduce((s, i) => s + i.valor_atual, 0);
  const rentabilidadeTotal = totalAtual - totalAportado;
  const pctRentabilidade = totalAportado > 0 ? (rentabilidadeTotal / totalAportado) * 100 : 0;

  // Distribuição por tipo (para o "gráfico" simples de barras)
  const distribuicaoPorTipo = Object.keys(TIPO_CONFIG).map((tipo) => {
    const items = investimentos.filter((i) => i.tipo === tipo);
    const total = items.reduce((s, i) => s + i.valor_atual, 0);
    return { tipo, total, config: TIPO_CONFIG[tipo] };
  }).filter((d) => d.total > 0);

  const totalCarteira = distribuicaoPorTipo.reduce((s, d) => s + d.total, 0);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Investimentos</h1>
      <p className="text-[var(--texto-secundario)] mb-6">
        Acompanhamento da carteira e rentabilidade
      </p>

      {/* RESUMO GERAL */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card-tech p-5">
          <p className="text-sm text-[var(--texto-secundario)]">Total aportado</p>
          <p className="text-2xl font-bold">R$ {totalAportado.toLocaleString("pt-BR")}</p>
        </div>
        <div className="card-tech p-5">
          <p className="text-sm text-[var(--texto-secundario)]">Valor atual</p>
          <p className="text-2xl font-bold text-[var(--azul-neon)]">R$ {totalAtual.toLocaleString("pt-BR")}</p>
        </div>
        <div className="card-tech p-5">
          <p className="text-sm text-[var(--texto-secundario)]">Rentabilidade</p>
          <p className="text-2xl font-bold" style={{ color: rentabilidadeTotal >= 0 ? "#22c55e" : "#ef4444" }}>
            R$ {rentabilidadeTotal.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="card-tech p-5">
          <p className="text-sm text-[var(--texto-secundario)]">% Rentabilidade</p>
          <p className="text-2xl font-bold" style={{ color: pctRentabilidade >= 0 ? "#22c55e" : "#ef4444" }}>
            {pctRentabilidade >= 0 ? "+" : ""}{pctRentabilidade.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* DISTRIBUIÇÃO POR TIPO */}
      {distribuicaoPorTipo.length > 0 && (
        <div className="card-tech p-5 mb-8">
          <h2 className="text-lg font-semibold mb-4">Distribuição da carteira</h2>
          <div className="space-y-3">
            {distribuicaoPorTipo.map((d) => {
              const pct = totalCarteira > 0 ? (d.total / totalCarteira) * 100 : 0;
              return (
                <div key={d.tipo}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{d.config.label}</span>
                    <span className="text-[var(--texto-secundario)]">
                      R$ {d.total.toLocaleString("pt-BR")} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${pct}%`, background: d.config.cor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTRO */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
          className="bg-[var(--azul-painel)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm">
          <option value="todos">Todos os tipos</option>
          {Object.entries(TIPO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* FORMULÁRIO */}
      <form onSubmit={salvarInvestimento} className="card-tech p-6 mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Nome do ativo</label>
          <input type="text" value={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.value })}
            placeholder="Ex: Tesouro Selic 2029"
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Tipo</label>
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm">
            {Object.entries(TIPO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Data do aporte</label>
          <input type="date" value={form.data_aporte} onChange={(e) => setForm({ ...form, data_aporte: e.target.value })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Valor aportado (R$)</label>
          <input type="text" inputMode="decimal" value={form.valor_aportado} ... />
            onChange={(e) => setForm({ ...form, valor_aportado: e.target.value.replace(/[^0-9,]/g, "") })
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Valor atual (R$)</label>
          <input type="number" step="0.01" value={form.valor_atual}
            onChange={(e) => setForm({ ...form, valor_atual: Number(e.target.value) })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Observação</label>
          <input type="text" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />
        </div>

        <div className="md:col-span-3 flex gap-3">
          <button type="submit" className="gradiente-logo px-5 py-2 rounded-lg text-sm font-semibold text-[var(--azul-escuro)] hover:opacity-90 transition">
            {editando ? "Salvar alterações" : "+ Adicionar investimento"}
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
      ) : investimentosFiltrados.length === 0 ? (
        <p className="text-[var(--texto-secundario)]">Nenhum investimento cadastrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {investimentosFiltrados.map((inv) => {
            const rentabilidade = inv.valor_atual - inv.valor_aportado;
            const pct = inv.valor_aportado > 0 ? (rentabilidade / inv.valor_aportado) * 100 : 0;
            const config = TIPO_CONFIG[inv.tipo];

            return (
              <div key={inv.id} className="card-tech p-5" style={{ borderLeft: `3px solid ${config.cor}` }}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{inv.ativo}</h3>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: `${config.cor}22`, color: config.cor }}>
                    {config.label}
                  </span>
                </div>

                <p className="text-sm text-[var(--texto-secundario)]">
                  Aportado: R$ {inv.valor_aportado.toLocaleString("pt-BR")}
                </p>
                <p className="text-sm text-[var(--texto-secundario)]">
                  Atual: R$ {inv.valor_atual.toLocaleString("pt-BR")}
                </p>
                <p className="text-sm font-semibold mt-1" style={{ color: rentabilidade >= 0 ? "#22c55e" : "#ef4444" }}>
                  {rentabilidade >= 0 ? "+" : ""}R$ {rentabilidade.toLocaleString("pt-BR")} ({pct.toFixed(1)}%)
                </p>
                <p className="text-xs text-[var(--texto-secundario)] mt-1">
                  Aportado em {new Date(inv.data_aporte).toLocaleDateString("pt-BR")}
                </p>
                {inv.observacao && <p className="text-xs italic text-[var(--texto-secundario)] mt-1">"{inv.observacao}"</p>}

                <div className="flex gap-2 mt-4">
                  <button onClick={() => iniciarEdicao(inv)} className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(0,200,255,0.3)] text-[var(--azul-neon)] hover:bg-[rgba(0,200,255,0.1)] transition">
                    Editar
                  </button>
                  <button onClick={() => excluirInvestimento(inv.id)} className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(239,68,68,0.3)] text-[var(--vermelho-alerta)] hover:bg-[rgba(239,68,68,0.1)] transition">
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
