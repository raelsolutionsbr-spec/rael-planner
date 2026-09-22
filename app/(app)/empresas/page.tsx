"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Empresa = {
  id: string;
  nome: string;
  tipo: string;
  cor_tema: string;
  meta_mensal: number;
  ativa: boolean;
};

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [form, setForm] = useState({
    nome: "",
    tipo: "propria",
    cor_tema: "#00c8ff",
    meta_mensal: 0,
  });

  async function carregarEmpresas() {
    setLoading(true);
    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) console.error(error);
    setEmpresas(data || []);
    setLoading(false);
  }

  useEffect(() => {
    carregarEmpresas();
  }, []);

  function resetForm() {
    setForm({ nome: "", tipo: "propria", cor_tema: "#00c8ff", meta_mensal: 0 });
    setEditando(null);
  }

  async function salvarEmpresa(e: React.FormEvent) {
    e.preventDefault();

    if (!form.nome.trim()) {
      alert("Digite o nome da empresa.");
      return;
    }

    // 1. Pega o usuário logado
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Usuário não autenticado. Faça login novamente.");
      return;
    }

    if (editando) {
      const { error } = await supabase
        .from("empresas")
        .update({
          nome: form.nome,
          tipo: form.tipo,
          cor_tema: form.cor_tema,
          meta_mensal: form.meta_mensal,
        })
        .eq("id", editando.id);

      if (error) {
        alert("Erro ao atualizar: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("empresas").insert([
        {
          nome: form.nome,
          tipo: form.tipo,
          cor_tema: form.cor_tema,
          meta_mensal: form.meta_mensal,
          user_id: user.id,
        },
      ]);

      if (error) {
        alert("Erro ao criar: " + error.message);
        return;
      }
    }

    resetForm();
    carregarEmpresas();
  }

  function iniciarEdicao(empresa: Empresa) {
    setEditando(empresa);
    setForm({
      nome: empresa.nome,
      tipo: empresa.tipo,
      cor_tema: empresa.cor_tema,
      meta_mensal: empresa.meta_mensal,
    });
  }

  async function excluirEmpresa(id: string) {
    if (
      !confirm(
        "Tem certeza que deseja excluir esta empresa? Isso também remove clientes/lançamentos vinculados."
      )
    )
      return;

    const { error } = await supabase.from("empresas").delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir: " + error.message);
      return;
    }
    carregarEmpresas();
  }

  async function alternarAtiva(empresa: Empresa) {
    const { error } = await supabase
      .from("empresas")
      .update({ ativa: !empresa.ativa })
      .eq("id", empresa.id);

    if (error) {
      alert("Erro: " + error.message);
      return;
    }
    carregarEmpresas();
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Empresas</h1>
      <p className="text-[var(--texto-secundario)] mb-8">
        Cadastre e gerencie suas empresas próprias e parceiras
      </p>

      {/* FORMULÁRIO */}
      <form
        onSubmit={salvarEmpresa}
        className="card-tech p-6 mb-8 grid grid-cols-1 md:grid-cols-5 gap-4 items-end"
      >
        <div className="md:col-span-2">
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">
            Nome da empresa
          </label>
          <input
            type="text"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex: Rael Solutions"
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--azul-neon)]"
          />
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">
            Tipo
          </label>
          <select
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--azul-neon)]"
          >
            <option value="propria">Própria</option>
            <option value="parceira">Parceira</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">
            Cor de identidade
          </label>
          <input
            type="color"
            value={form.cor_tema}
            onChange={(e) => setForm({ ...form, cor_tema: e.target.value })}
            className="w-full h-10 bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg cursor-pointer"
          />
        </div>

        <div>
          <label className="text-sm text-[var(--texto-secundario)] block mb-1">
            Meta mensal (R$)
          </label>
          <input
            type="number"
            value={form.meta_mensal}
            onChange={(e) =>
              setForm({ ...form, meta_mensal: Number(e.target.value) })
            }
            className="w-full bg-[var(--azul-escuro)] border border-[rgba(0,200,255,0.2)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--azul-neon)]"
          />
        </div>

        <div className="md:col-span-5 flex gap-3">
          <button
            type="submit"
            className="gradiente-logo px-5 py-2 rounded-lg text-sm font-semibold text-[var(--azul-escuro)] hover:opacity-90 transition"
          >
            {editando ? "Salvar alterações" : "+ Adicionar empresa"}
          </button>
          {editando && (
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2 rounded-lg text-sm border border-[rgba(255,255,255,0.15)] text-[var(--texto-secundario)] hover:text-white transition"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* LISTA */}
      {loading ? (
        <p className="text-[var(--texto-secundario)]">Carregando empresas...</p>
      ) : empresas.length === 0 ? (
        <p className="text-[var(--texto-secundario)]">
          Nenhuma empresa cadastrada ainda. Adicione a primeira acima.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {empresas.map((empresa) => (
            <div
              key={empresa.id}
              className="card-tech p-5"
              style={{ borderLeft: `3px solid ${empresa.cor_tema}` }}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">{empresa.nome}</h3>
                  <span className="text-xs text-[var(--texto-secundario)] capitalize">
                    {empresa.tipo}
                  </span>
                </div>
                <button
                  onClick={() => alternarAtiva(empresa)}
                  className={`text-xs px-2 py-1 rounded-full ${
                    empresa.ativa
                      ? "bg-[rgba(34,197,94,0.15)] text-[var(--verde-sucesso)]"
                      : "bg-[rgba(239,68,68,0.15)] text-[var(--vermelho-alerta)]"
                  }`}
                >
                  {empresa.ativa ? "Ativa" : "Inativa"}
                </button>
              </div>

              <p className="text-sm text-[var(--texto-secundario)] mb-4">
                Meta mensal:{" "}
                <span className="text-white">
                  R$ {empresa.meta_mensal.toLocaleString("pt-BR")}
                </span>
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => iniciarEdicao(empresa)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(0,200,255,0.3)] text-[var(--azul-neon)] hover:bg-[rgba(0,200,255,0.1)] transition"
                >
                  Editar
                </button>
                <button
                  onClick={() => excluirEmpresa(empresa.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(239,68,68,0.3)] text-[var(--vermelho-alerta)] hover:bg-[rgba(239,68,68,0.1)] transition"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
