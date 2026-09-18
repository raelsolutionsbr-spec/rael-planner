'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Empresa = {
  id: string;
  nome: string;
  cor_tema: string;
  meta_mensal: number;
};

type Alerta = {
  empresa: string;
  status: 'vermelho' | 'amarelo' | 'verde';
  mensagem: string;
};

export default function DashboardPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<string | null>(null);
  const [gerandoInsight, setGerandoInsight] = useState(false);

  useEffect(() => {
    async function carregarEmpresas() {
      const { data, error } = await supabase.from('empresas').select('*');
      if (!error && data) setEmpresas(data);
      setLoading(false);
    }
    carregarEmpresas();
  }, []);

  async function gerarInsightIA(empresa: Empresa) {
    setGerandoInsight(true);
    try {
      const res = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa: empresa.nome,
          meta: empresa.meta_mensal,
          realizado: 0, // TODO: buscar da tabela financeiro
          clientesParados: [], // TODO: buscar da tabela clientes
          diasRestantes: 30 - new Date().getDate(),
        }),
      });
      const dados = await res.json();
      setInsight(dados.insight);
    } catch (err) {
      setInsight('Erro ao gerar insight. Tente novamente.');
    } finally {
      setGerandoInsight(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a1628] text-white p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#00c8ff]">Rael Planner</h1>
          <p className="text-gray-400 text-sm">Painel de controle Rael Solutions</p>
        </div>
        <button className="bg-[#ff6b35] hover:bg-orange-600 px-4 py-2 rounded-lg font-semibold transition">
          🔔 Alertas
        </button>
      </header>

      {/* Cards de empresas */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Empresas</h2>

        {loading && <p className="text-gray-400">Carregando empresas...</p>}

        {!loading && empresas.length === 0 && (
          <div className="bg-[#111c34] border border-[#1e3a8a] rounded-xl p-6 text-center text-gray-400">
            Nenhuma empresa cadastrada ainda. Vamos criar o CRUD de empresas no próximo passo.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {empresas.map((empresa) => (
            <div
              key={empresa.id}
              className="rounded-xl p-5 shadow-lg card-gradient border border-white/10"
              style={{ borderColor: empresa.cor_tema }}
            >
              <h3 className="font-bold text-lg mb-2">{empresa.nome}</h3>
              <p className="text-sm text-gray-200 mb-1">
                Meta mensal: R$ {empresa.meta_mensal?.toLocaleString('pt-BR') ?? 0}
              </p>
              <button
                onClick={() => gerarInsightIA(empresa)}
                disabled={gerandoInsight}
                className="mt-3 text-xs bg-black/30 hover:bg-black/50 px-3 py-1.5 rounded-lg transition"
              >
                {gerandoInsight ? 'Gerando...' : '✨ Gerar Insight IA'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Insight da IA */}
      {insight && (
        <section className="mb-10 bg-[#111c34] border border-[#00c8ff]/30 rounded-xl p-5">
          <h3 className="font-semibold text-[#00c8ff] mb-2">💡 Insight da IA (Gemini)</h3>
          <p className="text-gray-200 whitespace-pre-line">{insight}</p>
        </section>
      )}

      {/* Placeholders dos próximos módulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111c34] border border-white/10 rounded-xl p-5">
          <h3 className="font-semibold mb-2">📅 Rotina de Hoje</h3>
          <p className="text-gray-400 text-sm">Módulo de tarefas/agenda — próximo passo.</p>
        </div>
        <div className="bg-[#111c34] border border-white/10 rounded-xl p-5">
          <h3 className="font-semibold mb-2">👥 CRM — Clientes</h3>
          <p className="text-gray-400 text-sm">Funil de clientes — próximo passo.</p>
        </div>
      </div>
    </main>
  );
}
