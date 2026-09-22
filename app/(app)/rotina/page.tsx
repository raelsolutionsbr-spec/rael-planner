"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { pedirPermissaoNotificacao, verificarAlarmes } from "@/lib/webpush";

type Tarefa = {
  id: string;
  dia_semana: string;
  horario_inicio: string;
  horario_fim: string;
  descricao: string;
  categoria: string;
  alerta_ativo: boolean;
  concluida_hoje: boolean;
};

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const CATEGORIA_COR: Record<string, string> = {
  espiritual: "#a855f7",
  negocio: "#00c8ff",
  familia: "#ff6b35",
  estudo: "#f59e0b",
  redes_sociais: "#22c55e",
  domestico: "#94a3b8",
  saude: "#ef4444",
  geral: "#64748b",
};

const diaSemanaMap = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function RotinaPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [diaFiltro, setDiaFiltro] = useState(diaSemanaMap[new Date().getDay()]);
  const [editando, setEditando] = useState<Tarefa | null>(null);
  const [form, setForm] = useState({
    dia_semana: "Segunda",
    horario_inicio: "08:00",
    horario_fim: "09:00",
    descricao: "",
    categoria: "geral",
    alerta_ativo: true,
  });

  async function carregarTarefas() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
      setTarefas([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("tarefas")
      .select("*")
      .eq("user_id", userId)
      .order("dia_semana")
      .order("horario_inicio");

    if (error) console.error(error);
    setTarefas(data || []);
    setLoading(false);
  }

  useEffect(() => {
    carregarTarefas();
    pedirPermissaoNotificacao();
  }, []);

  useEffect(() => {
    if (tarefas.length === 0) return;
    const interval = setInterval(() => verificarAlarmes(tarefas), 60000);
    verificarAlarmes(tarefas);
    return () => clearInterval(interval);
  }, [tarefas]);

  function resetForm() {
    setForm({
      dia_semana: "Segunda",
      horario_inicio: "08:00",
      horario_fim: "09:00",
      descricao: "",
      categoria: "geral",
      alerta_ativo: true,
    });
    setEditando(null);
  }

  async function salvarTarefa(e: React.FormEvent) {
    e.preventDefault();
    if (!form.descricao.trim()) {
      alert("Digite a descrição da tarefa.");
      return;
    }

    if (editando) {
      const { error } = await supabase.from("tarefas").update(form).eq("id", editando.id);
      if (error) return alert("Erro: " + error.message);
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        alert("Usuário não autenticado.");
        return;
      }

      const { error } = await supabase
        .from("tarefas")
        .insert([{ ...form, user_id: userId }]);
      if (error) return alert("Erro: " + error.message);
    }

    resetForm();
    carregarTarefas();
  }

  function iniciarEdicao(t: Tarefa) {
    setEditando(t);
    setForm({
      dia_semana: t.dia_semana,
      horario_inicio: t.horario_inicio.slice(0, 5),
      horario_fim: t.horario_fim.slice(0, 5),
      descricao: t.descricao,
      categoria: t.categoria,
      alerta_ativo: t.alerta_ativo,
    });
  }

  async function excluirTarefa(id: string) {
    if (!confirm("Excluir esta tarefa?")) return;
    const { error } = await supabase.from("tarefas").delete().eq("id", id);
    if (error) return alert("Erro: " + error.message);
    carregarTarefas();
  }

  async function alternarAlerta(t: Tarefa) {
    await supabase.from("tarefas").update({ alerta_ativo: !t.alerta_ativo }).eq("id", t.id);
    carregarTarefas();
  }

  async function marcarConcluida(t: Tarefa) {
    await supabase.from("tarefas").update({ concluida_hoje: !t.concluida_hoje }).eq("id", t.id);
    carregarTarefas();
  }

  const tarefasDoDia = tarefas.filter((t) => t.dia_semana === diaFiltro);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Rotina / Tarefas</h1>
      <p className="text-[var(--texto-secundario)] mb-6">
        Sua agenda semanal completa, com alarmes automáticos
      </p>

      {/* ABAS DE DIA */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-tech pb-2">
        {DIAS.map((dia) => (
          <button
            key={dia}
            onClick={() => setDiaFiltro(dia)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition ${
              diaFiltro === dia
                ? "gradiente-logo text-[var(--azul-escuro)] font-semibold"
                : "card-tech text-[var(--texto-secundario)] hover:text-white"
            }`}
          >
            {dia}
          </button>
        ))}
      </div>

      {/* FORMULÁRIO */}
      <form onSubmit={salvarTarefa} className="card-tech p-6 mb-8 grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Dia</label>
          <select
            value={form.dia_semana}
            onChange={(e) => setForm({ ...form, dia_semana: e.target.value })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm"
          >
            {DIAS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Início</label>
          <input type="time" value={form.horario_inicio}
            onChange={(e) => setForm({ ...form, horario_inicio: e.target.value })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Fim</label>
          <input type="time" value={form.horario_fim}
            onChange={(e) => setForm({ ...form, horario_fim: e.target.value })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Descrição</label>
          <input type="text" value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Ex: Reunião com cliente"
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Categoria</label>
          <select
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="espiritual">Espiritual</option>
            <option value="negocio">Negócio</option>
            <option value="familia">Família</option>
            <option value="estudo">Estudo</option>
            <option value="redes_sociais">Redes Sociais</option>
            <option value="domestico">Doméstico</option>
            <option value="saude">Saúde</option>
            <option value="geral">Geral</option>
          </select>
        </div>

        <div className="md:col-span-6 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-[var(--texto-secundario)]">
            <input type="checkbox" checked={form.alerta_ativo}
              onChange={(e) => setForm({ ...form, alerta_ativo: e.target.checked })} />
            Alarme ativo
          </label>

          <button type="submit" className="gradiente-logo px-5 py-2 rounded-lg text-sm font-semibold text-[var(--azul-escuro)] hover:opacity-90 transition">
            {editando ? "Salvar alterações" : "+ Adicionar tarefa"}
          </button>
          {editando && (
            <button type="button" onClick={resetForm} className="px-5 py-2 rounded-lg text-sm border border-[rgba(255,255,255,0.15)] text-[var(--texto-secundario)] hover:text-white transition">
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* LISTA DO DIA */}
      {loading ? (
        <p className="text-[var(--texto-secundario)]">Carregando...</p>
      ) : tarefasDoDia.length === 0 ? (
        <p className="text-[var(--texto-secundario)]">Nenhuma tarefa cadastrada para {diaFiltro}.</p>
      ) : (
        <div className="space-y-3">
          {tarefasDoDia.map((t) => (
            <div key={t.id} className="card-tech p-4 flex items-center gap-4"
              style={{ borderLeft: `3px solid ${CATEGORIA_COR[t.categoria] || "#64748b"}` }}>
              <input type="checkbox" checked={t.concluida_hoje} onChange={() => marcarConcluida(t)}
                className="w-5 h-5 accent-[var(--azul-neon)] cursor-pointer" />

              <div className="flex-1">
                <p className={`font-medium ${t.concluida_hoje ? "line-through text-[var(--texto-secundario)]" : ""}`}>
                  {t.horario_inicio.slice(0,5)} - {t.horario_fim.slice(0,5)} · {t.descricao}
                </p>
                <span className="text-xs text-[var(--texto-secundario)] capitalize">
                  {t.categoria.replace("_", " ")}
                </span>
              </div>

              <button onClick={() => alternarAlerta(t)} title="Alarme">
                {t.alerta_ativo ? "🔔" : "🔕"}
              </button>
              <button onClick={() => iniciarEdicao(t)} className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(0,200,255,0.3)] text-[var(--azul-neon)] hover:bg-[rgba(0,200,255,0.1)] transition">
                Editar
              </button>
              <button onClick={() => excluirTarefa(t.id)} className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(239,68,68,0.3)] text-[var(--vermelho-alerta)] hover:bg-[rgba(239,68,68,0.1)] transition">
                Excluir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
