"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { pedirPermissaoNotificacao } from "@/lib/webpush";

type Empresa = { id: string; nome: string; cor_tema: string };
type Cliente = { id: string; nome: string; empresa_id: string };

type Evento = {
  id: string;
  titulo: string;
  empresa_id: string | null;
  cliente_id: string | null;
  data_hora: string;
  tipo: string;
  status: string;
  observacao: string;
};

const TIPO_CONFIG: Record<string, { label: string; cor: string; icone: string }> = {
  reuniao: { label: "Reunião", cor: "#00c8ff", icone: "🗣️" },
  networking: { label: "Networking", cor: "#ff6b35", icone: "🤝" },
  visita_comercial: { label: "Visita Comercial", cor: "#22c55e", icone: "🏢" },
};

export default function CalendarioPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Evento | null>(null);
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const [form, setForm] = useState({
    titulo: "",
    empresa_id: "",
    cliente_id: "",
    data_hora: "",
    tipo: "reuniao",
    status: "agendado",
    observacao: "",
  });

  async function carregarDados() {
    setLoading(true);
    const { data: emp } = await supabase.from("empresas").select("id, nome, cor_tema").eq("ativa", true);
    const { data: cli } = await supabase.from("clientes").select("id, nome, empresa_id");
    const { data: ev } = await supabase.from("eventos").select("*").order("data_hora", { ascending: true });

    setEmpresas(emp || []);
    setClientes(cli || []);
    setEventos(ev || []);
    setLoading(false);
  }

  useEffect(() => {
    carregarDados();
    pedirPermissaoNotificacao();
  }, []);

  // Verifica alarmes de eventos próximos (10 min antes)
  useEffect(() => {
    if (eventos.length === 0) return;

    function verificarAlarmesEventos() {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const agora = new Date();

      eventos
        .filter((e) => e.status === "agendado")
        .forEach((e) => {
          const dataEvento = new Date(e.data_hora);
          const diffMin = (dataEvento.getTime() - agora.getTime()) / 60000;

          if (diffMin > 0 && diffMin <= 10) {
            const chave = `evento-notif-${e.id}`;
            if (!sessionStorage.getItem(chave)) {
              new Notification("📅 Evento se aproximando", {
                body: `${e.titulo} às ${dataEvento.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
                icon: "/favicon.ico",
              });
              sessionStorage.setItem(chave, "1");
            }
          }
        });
    }

    verificarAlarmesEventos();
    const interval = setInterval(verificarAlarmesEventos, 60000);
    return () => clearInterval(interval);
  }, [eventos]);

  function resetForm() {
    setForm({
      titulo: "",
      empresa_id: "",
      cliente_id: "",
      data_hora: "",
      tipo: "reuniao",
      status: "agendado",
      observacao: "",
    });
    setEditando(null);
  }

  async function salvarEvento(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return alert("Digite o título do evento.");
    if (!form.data_hora) return alert("Selecione data e hora.");

    const payload = {
      ...form,
      empresa_id: form.empresa_id || null,
      cliente_id: form.cliente_id || null,
    };

    if (editando) {
      const { error } = await supabase.from("eventos").update(payload).eq("id", editando.id);
      if (error) return alert("Erro: " + error.message);
    } else {
      const { error } = await supabase.from("eventos").insert([payload]);
      if (error) return alert("Erro: " + error.message);
    }

    resetForm();
    carregarDados();
  }

  function iniciarEdicao(ev: Evento) {
    setEditando(ev);
    setForm({
      titulo: ev.titulo,
      empresa_id: ev.empresa_id || "",
      cliente_id: ev.cliente_id || "",
      data_hora: ev.data_hora.slice(0, 16),
      tipo: ev.tipo,
      status: ev.status,
      observacao: ev.observacao || "",
    });
  }

  async function excluirEvento(id: string) {
    if (!confirm("Excluir este evento?")) return;
    const { error } = await supabase.from("eventos").delete().eq("id", id);
    if (error) return alert("Erro: " + error.message);
    carregarDados();
  }

  async function mudarStatus(ev: Evento, novoStatus: string) {
    await supabase.from("eventos").update({ status: novoStatus }).eq("id", ev.id);
    carregarDados();
  }

  function nomeEmpresa(id: string | null) {
    return empresas.find((e) => e.id === id)?.nome || "—";
  }
  function nomeCliente(id: string | null) {
    return clientes.find((c) => c.id === id)?.nome || "—";
  }

  function contagemRegressiva(dataHora: string) {
    const diff = new Date(dataHora).getTime() - new Date().getTime();
    if (diff < 0) return "Encerrado";
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
    if (dias > 0) return `Em ${dias}d ${horas}h`;
    const min = Math.floor((diff / (1000 * 60)) % 60);
    return `Em ${horas}h ${min}min`;
  }

  const eventosFiltrados = useMemo(() => {
    return eventos.filter((e) => filtroStatus === "todos" || e.status === filtroStatus);
  }, [eventos, filtroStatus]);

  const proximosEventos = eventosFiltrados.filter(
    (e) => e.status === "agendado" && new Date(e.data_hora) >= new Date()
  );
  const eventosPassados = eventosFiltrados.filter(
    (e) => e.status !== "agendado" || new Date(e.data_hora) < new Date()
  );

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Calendário / Eventos</h1>
      <p className="text-[var(--texto-secundario)] mb-6">
        Reuniões, networking e visitas comerciais
      </p>

      {/* FILTRO */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
          className="bg-[var(--azul-painel)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm">
          <option value="todos">Todos os status</option>
          <option value="agendado">Agendado</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {/* FORMULÁRIO */}
      <form onSubmit={salvarEvento} className="card-tech p-6 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="md:col-span-2">
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Título</label>
          <input type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Ex: Reunião com fornecedor"
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Data e Hora</label>
          <input type="datetime-local" value={form.data_hora}
            onChange={(e) => setForm({ ...form, data_hora: e.target.value })}
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
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Empresa (opcional)</label>
          <select value={form.empresa_id} onChange={(e) => setForm({ ...form, empresa_id: e.target.value, cliente_id: "" })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm">
            <option value="">Nenhuma</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Cliente (opcional)</label>
          <select value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm">
            <option value="">Nenhum</option>
            {clientes
              .filter((c) => !form.empresa_id || c.empresa_id === form.empresa_id)
              .map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">Observação</label>
          <input type="text" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm" />
        </div>

        <div className="md:col-span-4 flex gap-3">
          <button type="submit" className="gradiente-logo px-5 py-2 rounded-lg text-sm font-semibold text-[var(--azul-escuro)] hover:opacity-90 transition">
            {editando ? "Salvar alterações" : "+ Agendar evento"}
          </button>
          {editando && (
            <button type="button" onClick={resetForm} className="px-5 py-2 rounded-lg text-sm border border-[rgba(255,255,255,0.15)] text-[var(--texto-secundario)] hover:text-white transition">
              Cancelar edição
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-[var(--texto-secundario)]">Carregando...</p>
      ) : (
        <>
          {/* PRÓXIMOS EVENTOS */}
          <h2 className="text-lg font-semibold mb-3">📅 Próximos eventos</h2>
          {proximosEventos.length === 0 ? (
            <p className="text-[var(--texto-secundario)] mb-8">Nenhum evento agendado.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {proximosEventos.map((ev) => (
                <div key={ev.id} className="card-tech p-5" style={{ borderLeft: `3px solid ${TIPO_CONFIG[ev.tipo].cor}` }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{TIPO_CONFIG[ev.tipo].icone} {ev.titulo}</h3>
                      <span className="text-xs text-[var(--texto-secundario)]">{TIPO_CONFIG[ev.tipo].label}</span>
                    </div>
                    <select value={ev.status} onChange={(e) => mudarStatus(ev, e.target.value)}
                      className="text-xs px-2 py-1 rounded-full bg-[rgba(0,200,255,0.1)] text-[var(--azul-neon)] border-none">
                      <option value="agendado">Agendado</option>
                      <option value="concluido">Concluído</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>

                  <p className="text-sm text-[var(--texto-secundario)]">
                    🕒 {new Date(ev.data_hora).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                  {ev.empresa_id && <p className="text-sm text-[var(--texto-secundario)]">🏢 {nomeEmpresa(ev.empresa_id)}</p>}
                  {ev.cliente_id && <p className="text-sm text-[var(--texto-secundario)]">👤 {nomeCliente(ev.cliente_id)}</p>}
                  {ev.observacao && <p className="text-xs italic text-[var(--texto-secundario)] mt-1">"{ev.observacao}"</p>}

                  <p className="text-sm font-semibold mt-2 text-[var(--azul-neon)]">
                    ⏳ {contagemRegressiva(ev.data_hora)}
                  </p>

                  <div className="flex gap-2 mt-4">
                    <button onClick={() => iniciarEdicao(ev)} className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(0,200,255,0.3)] text-[var(--azul-neon)] hover:bg-[rgba(0,200,255,0.1)] transition">
                      Editar
                    </button>
                    <button onClick={() => excluirEvento(ev.id)} className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(239,68,68,0.3)] text-[var(--vermelho-alerta)] hover:bg-[rgba(239,68,68,0.1)] transition">
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* HISTÓRICO */}
          <h2 className="text-lg font-semibold mb-3">🗂️ Histórico</h2>
          {eventosPassados.length === 0 ? (
            <p className="text-[var(--texto-secundario)]">Nenhum evento no histórico.</p>
          ) : (
            <div className="space-y-2">
              {eventosPassados.map((ev) => (
                <div key={ev.id} className="card-tech p-4 flex items-center gap-4 opacity-70"
                  style={{ borderLeft: `3px solid ${TIPO_CONFIG[ev.tipo].cor}` }}>
                  <div className="flex-1">
                    <p className="font-medium">{TIPO_CONFIG[ev.tipo].icone} {ev.titulo}</p>
                    <p className="text-xs text-[var(--texto-secundario)]">
                      {new Date(ev.data_hora).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      {ev.empresa_id && ` · ${nomeEmpresa(ev.empresa_id)}`}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full"
                    style={{
                      background: ev.status === "concluido" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                      color: ev.status === "concluido" ? "#22c55e" : "#ef4444",
                    }}>
                    {ev.status === "concluido" ? "Concluído" : "Cancelado"}
                  </span>
                  <button onClick={() => excluirEvento(ev.id)} className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(239,68,68,0.3)] text-[var(--vermelho-alerta)] hover:bg-[rgba(239,68,68,0.1)] transition">
                    Excluir
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
