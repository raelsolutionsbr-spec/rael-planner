import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  const { empresa, meta, realizado, clientesParados, diasRestantes } = await request.json();

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  const prompt = `
    Você é um consultor de vendas da empresa "${empresa}".
    Meta do mês: R$ ${meta}
    Realizado até agora: R$ ${realizado}
    Clientes parados em negociação: ${clientesParados.join(', ') || 'nenhum'}
    Dias restantes no mês: ${diasRestantes}

    Dê no máximo 3 sugestões PRÁTICAS e DIRETAS (em português, tom objetivo)
    para ajudar a fechar o mês no verde.
  `;

  const result = await model.generateContent(prompt);
  const texto = result.response.text();

  return Response.json({ insight: texto });
}
