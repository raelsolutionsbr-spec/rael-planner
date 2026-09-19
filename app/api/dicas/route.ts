import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const dados = await req.json();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Você é um consultor de gestão pessoal e empresarial. Analise os dados abaixo e gere no máximo 5 dicas práticas, diretas e objetivas (1 a 2 frases cada) para melhorar a performance financeira, produtividade e gestão de clientes do usuário.

DADOS FINANCEIROS DO MÊS:
- Total de entradas: R$ ${dados.totalEntradas}
- Total de saídas: R$ ${dados.totalSaidas}
- Saldo geral: R$ ${dados.saldoGeral}
- % gasto sobre entradas: ${dados.pctGasto.toFixed(1)}%

EMPRESAS COM PROBLEMAS:
${dados.empresasProblema.length > 0 ? dados.empresasProblema.map((e: any) => `- ${e.nome}: saldo R$ ${e.saldo}, status ${e.status}`).join("\n") : "Nenhuma empresa com alerta."}

CRM:
- Clientes frios (sem contato há +15 dias): ${dados.clientesFrios}
- Leads em aberto: ${dados.leads}
- Clientes em negociação: ${dados.negociacao}

ROTINA:
- Tarefas concluídas hoje: ${dados.tarefasConcluidas}/${dados.tarefasTotal}
- Categoria com mais tempo dedicado: ${dados.categoriaDominante}

INVESTIMENTOS:
- Rentabilidade da carteira: ${dados.rentabilidadePct.toFixed(1)}%

Responda em português do Brasil, em formato de lista simples, sem introdução nem conclusão, indo direto às dicas. Cada dica deve começar com um emoji relevante.
`;

    const result = await model.generateContent(prompt);
    const texto = result.response.text();

    return NextResponse.json({ dicas: texto });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao gerar dicas: " + error.message }, { status: 500 });
  }
}
