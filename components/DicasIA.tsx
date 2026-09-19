"use client";

import { useState } from "react";

type Props = {
  totalEntradas: number;
  totalSaidas: number;
  saldoGeral: number;
  pctGasto: number;
  empresasProblema: { nome: string; saldo: number; status: string }[];
  clientesFrios: number;
  leads: number;
  negociacao: number;
  tarefasConcluidas: number;
  tarefasTotal: number;
  categoriaDominante: string;
  rentabilidadePct: number;
};

export default function DicasIA(props: Props) {
  const [dicas, setDicas] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function gerarDicas() {
    setLoading(true);
    setErro("");
    try {
      const res = await fetch("/api/dicas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(props),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDicas(data.dicas);
    } catch (e: any) {
      setErro("Não foi possível gerar as dicas agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card-tech p-5 mb-8">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">🤖 Dicas Inteligentes</h2>
        <button
          onClick={gerarDicas}
          disabled={loading}
          className="gradiente-logo px-4 py-2 rounded-lg text-sm font-semibold text-[var(--azul-escuro)] hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Analisando..." : dicas ? "Atualizar dicas" : "Gerar dicas com IA"}
        </button>
      </div>

      {erro && <p className="text-sm text-[var(--vermelho-alerta)]">{erro}</p>}

      {dicas ? (
        <div className="text-sm whitespace-pre-line text-[var(--texto-secundario)] leading-relaxed">
          {dicas}
        </div>
      ) : !loading && !erro ? (
        <p className="text-sm text-[var(--texto-secundario)]">
          Clique no botão para receber dicas personalizadas com base nos seus dados atuais.
        </p>
      ) : null}
    </div>
  );
}
