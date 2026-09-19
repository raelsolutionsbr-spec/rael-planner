"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const diaSemanaMap = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function DashboardPage() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [financeiro, setFinanceiro] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [tarefasHoje, setTarefasHoje] = useState<any[]>([]);
  const [proximosEventos, setProximosEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const hoje = new Date();
  const diaHoje = diaSemanaMap[hoje.getDay()];
  const mesAtual = hoje.toISOString().slice(0, 7);

  async function carregarTudo() {
    setLoading(true);
    const [{ data: emp }, { data: fin }, { data: cli }, { data: tar }, { data: ev }] = await Promise.all([
      supabase.from("empresas").select("*").eq("ativa", true),
      supabase.from("financeiro").select("*"),
      supabase.from("clientes").select("*"),
      supabase.from("tarefas").select("*").eq("dia_semana", diaHoje).order("horario_inicio"),
      supabase.from("eventos").select("*").eq("status", "agendado").gte("data_hora", new Date().toISOString()).order("data_hora").limit(5),
    ]);

    setEmpresas(emp || []);
    setFinanceiro(fin || []);
    setClientes(cli || []);
    setTarefasHoje(tar || []);
    setProximosEventos(ev || []);
    setLoading(false);
  }

  useEffect(() => {
    carregarTudo();
  }, []);

  // ---------- CÁLCULOS FINANCEIROS ----------
  const finMes = financeiro.filter((f) => f.data.slice(0, 7) === mesAtual);
  const totalEntradas = finMes.filter((f) => f.tipo === "entrada").reduce((s, f) => s + f.valor, 0);
  const totalSaidas = finMes.filter((f) => f.tipo === "saida").reduce((s, f) => s + f.valor, 0);
  const saldoGeral = totalEntradas - totalSaidas;
  const pctGasto = totalEntradas > 0 ? (totalSaidas / totalEntradas) * 100 : totalSaidas > 0 ? 100 : 0;

  // Saldo pessoal
  const finPessoal = finMes.filter((f) => f.origem === "pessoal");
  const saldoPessoal =
    finPessoal.filter((f) => f.tipo === "entrada").reduce((s, f) => s + f.valor, 0) -
    finPessoal.filter((f) => f.tipo === "saida").reduce((s, f) => s + f.valor, 0);

  // Saldo/status por empresa
  const empresasComSaldo = empresas.map((emp) => {
    const lancs = finMes.filter((f) => f.empresa_id === emp.id);
    const entradas = lancs.filter((f) => f.tipo === "entrada").reduce((s, f) => s + f.valor, 0);
    const saidas = lancs.filter((f) => f.tipo === "saida").reduce((s, f) => s + f.valor, 0);
    const saldo = entradas - saidas;
    const pct = entradas > 0 ? (saidas / entradas) * 100 : saidas > 0 ? 100 : 0;

    let status = { label: "Positivo", cor: "#22c55e" };
    if (saldo < 0) status = { label: "Vermelho", cor: "#ef4444" };
    else if (pct > 70) status = { label: "Margem baixa", cor: "#f59e0b" };

    return { ...emp, entradas, saidas, saldo, status, pctMeta: emp.meta_mensal > 0 ? (entradas / emp.meta_mensal) * 100 : 0 };
  });

  // ---------- CRM ----------
  const clientesFrios = clientes.filter((c) => {
    if (!c.ultima_interacao) return false;
    const dias = (Date.now() - new Date(c.ultima_interacao).getTime()) / (1000 * 60 * 60 * 24);
    return dias > 15 && c.status !== "inativo";
  });
  const funil = {
    lead: clientes.filter((c) => c.status === "lead").length,
    negociacao: clientes.filter((c) => c.status === "negociacao").length,
    ativo: clientes.filter((c) => c.status === "ativo").length,
  };

  // ---------- TAREFAS ----------
  const tarefasConcluidas = tarefasHoje.filter((t) => t.concluida_hoje).length;
  const pctTarefas = tarefasHoje.length > 0 ? (tarefasConcluidas / tarefasHoje.length) * 100 : 0;

  // ---------- ALERTAS INTELIGENTES ----------
  const alertas: { tipo: string; cor: string; mensagem: string }[] = [];

  if (saldoGeral < 0) {
    alertas.push({
      tipo: "vermelho",
      cor: "#ef4444",
      mensagem: `⚠️ No ritmo atual, o mês fecha no vermelho em R$ ${Math.abs(saldoGeral).toLocaleString("pt-BR")}.`,
    });
  } else if (pctGasto > 70) {
    alertas.push({
      tipo: "amarelo",
      cor: "#f59e0b",
      mensagem: `🔍 Margem de segurança baixa esse mês (${pctGasto.toFixed(0)}% já foi gasto). Fique de olho.`,
    });
  }

  empresasComSaldo.forEach((emp) => {
    if (emp.status.label === "Vermelho") {
      alertas.push({ tipo: "vermelho", cor: "#ef4444", mensagem: `⚠️ ${emp.nome}: mês projetado no vermelho.` });
    } else if (emp.status.label === "Margem baixa") {
      alertas.push({ tipo: "amarelo", cor: "#f59e0b", mensagem: `🔍 ${emp.nome}: margem de lucro baixa este mês.` });
    }
  });

  if (clientesFrios.length > 0) {
    alertas.push({
      tipo: "amarelo",
      cor: "#f59e0b",
      mensagem: `🥶 ${clientesFrios.length} cliente(s) sem follow-up há mais de 15 dias. Ação recomendada.`,
    });
  }

  if (alertas.length === 0) {
    alertas.push({ tipo: "verde", cor: "#22c55e", mensagem: "✅ Tudo em ordem! Nenhum alerta crítico neste momento." });
  }

  if (loading) return <p className="text-[var(--texto-secundario)]">Carregando dashboard...</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
      <p className="text-[var(--texto-secundario)] mb-6">
        Visão consolidada — {hoje.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
      </p>

      {/* ALERTAS */}
      <div className="space-y-2 mb-8">
        {alertas.map((a, i) => (
          <div key={i} className="card-tech p-4 flex items-center gap-3" style={{ borderLeft: `3px solid ${a.cor}` }}>
            <p className="text-sm" style={{ color: a.cor }}>{a.mensagem}</p>
          </div>
        ))}
      </div>

      {/* RESUMO GERAL */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card-tech p-5">
          <p className="text-sm text-[var(--texto-secundario)]">Saldo geral do mês</p>
          <p className="text-2xl font-bold" style={{ color: saldoGeral >= 0 ? "#22c55e" : "#ef4444" }}>
            R$ {saldoGeral.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="card-tech p-5">
          <p className="text-sm text-[var(--texto-secundario)]">Saldo pessoal</p>
          <p className="text-2xl font-bold" style={{ color: saldoPessoal >= 0 ? "#22c55e" : "#ef4444" }}>
            R$ {saldoPessoal.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="card-tech p-5">
          <p className="text-sm text-[var(--texto-secundario)]">Tarefas de hoje</p>
          <p className="text-2xl font-bold text-[var(--azul-neon)]">{tarefasConcluidas}/{tarefasHoje.length}</p>
          <div className="w-full h-2 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden mt-2">
            <div className="h-full gradiente-logo" style={{ width: `${pctTarefas}%` }} />
          </div>
        </div>
        <div className="card-tech p-5">
          <p className="text-sm text-[var(--texto-secundario)]">Clientes no funil</p>
          <p className="text-2xl font-bold text-[var(--laranja-vibrante)]">
            {funil.lead + funil.negociacao + funil.ativo}
          </p>
          <p className="text-xs text-[var(--texto-secundario)]">
            {funil.lead} leads · {funil.negociacao} negociação · {funil.ativo} ativos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARDS POR EMPRESA */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-3">🏢 Empresas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {empresasComSaldo.map((emp) => (
              <Link key={emp.id} href="/financeiro" className="card-tech p-4 hover:scale-[1.02] transition block"
                style={{ borderLeft: `3px solid ${emp.cor_tema}` }}>
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-semibold">{emp.nome}</h3>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: `${emp.status.cor}22`, color: emp.status.cor }}>
                    {emp.status.label}
                  </span>
                </div>
                <p className="text-sm" style={{ color: emp.saldo >= 0 ? "#22c55e" : "#ef4444" }}>
                  Saldo: R$ {emp.saldo.toLocaleString("pt-BR")}
                </p>
                {emp.meta_mensal > 0 && (
                  <>
                    <div className="w-full h-2 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden mt-2">
                      <div className="h-full gradiente-logo" style={{ width: `${Math.min(emp.pctMeta, 100)}%` }} />
                    </div>
                    <p className="text-xs text-[var(--texto-secundario)] mt-1">{emp.pctMeta.toFixed(0)}% da meta</p>
                  </>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* PRÓXIMOS EVENTOS */}
        <div>
          <h2 className="text-lg font-semibold mb-3">📅 Próximos eventos</h2>
          <div className="space-y-3">
            {proximosEventos.length === 0 ? (
              <p className="text-sm text-[var(--texto-secundario)]">Nenhum evento agendado.</p>
            ) : (
              proximosEventos.map((ev) => (
                <Link key={ev.id} href="/calendario" className="card-tech p-3 block hover:scale-[1.02] transition">
                  <p className="text-sm font-medium">{ev.titulo}</p>
                  <p className="text-xs text-[var(--texto-secundario)]">
                    {new Date(ev.data_hora).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* TAREFAS DE HOJE */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">✅ Tarefas de hoje ({diaHoje})</h2>
        {tarefasHoje.length === 0 ? (
          <p className="text-sm text-[var(--texto-secundario)]">Nenhuma tarefa cadastrada para hoje.</p>
        ) : (
          <div className="space-y-2">
            {tarefasHoje.slice(0, 6).map((t) => (
              <div key={t.id} className="card-tech p-3 flex items-center gap-3">
                <span className={t.concluida_hoje ? "text-[var(--verde-sucesso)]" : "text-[var(--texto-secundario)]"}>
                  {t.concluida_hoje ? "✅" : "⏳"}
                </span>
                <p className={`text-sm flex-1 ${t.concluida_hoje ? "line-through text-[var(--texto-secundario)]" : ""}`}>
                  {t.horario_inicio.slice(0,5)} · {t.descricao}
                </p>
              </div>
            ))}
            <Link href="/rotina" className="text-sm text-[var(--azul-neon)] hover:underline block mt-2">
              Ver rotina completa →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
