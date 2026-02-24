import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getApiKey(): string | null {
  const key =
    (import.meta as any)?.env?.VITE_GEMINI_API_KEY ||
    (process as any)?.env?.GEMINI_API_KEY ||
    (process as any)?.env?.API_KEY;

  const apiKey = (key ?? "").toString().trim();
  return apiKey.length ? apiKey : null;
}

export function isGeminiConfigured(): boolean {
  return !!getApiKey();
}

function getAI(): GoogleGenAI {
  if (aiInstance) return aiInstance;

  const apiKey = getApiKey();
  if (!apiKey) {
    // IMPORTANTÍSSIMO: não deixar isso derrubar o app inteiro
    // (o erro do @google/genai é fatal se instanciar sem key válida)
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  aiInstance = new GoogleGenAI({ apiKey });
  return aiInstance;
}

export type RecipeCard = {
  title: string;
  subtitle: string;
  ingredients: string[];
  steps: string[];
  time_minutes?: number;
  servings?: number;
  tags?: string[];
};

export const generateRecipes = async (userText: string): Promise<RecipeCard[]> => {
  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
Você é um chef de cozinha criativo e prático.

O usuário vai informar ingredientes e preferências.
Texto do usuário:
"""${userText}"""

TAREFA:
- Gere receitas culinárias baseadas no texto.
- PADRÃO: Gere APENAS 1 receita se não for especificado quantidade.
- Se o usuário pedir mais (ex: "3 receitas", "mais opções"), gere a quantidade solicitada.
- Cada receita deve vir com:
  title (título curto),
  subtitle (descrição curta),
  ingredients (lista),
  steps (passo a passo),
  time_minutes (opcional),
  servings (opcional),
  tags (opcional, ex: ["assado","rápido"]).

Retorne APENAS JSON conforme o schema.
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
            steps: { type: Type.ARRAY, items: { type: Type.STRING } },
            time_minutes: { type: Type.NUMBER },
            servings: { type: Type.NUMBER },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["title", "subtitle", "ingredients", "steps"],
        },
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from model");

  const data = JSON.parse(text);
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("A IA não retornou receitas.");
  }

  return data as RecipeCard[];
};

/**
 * Gera imagem do prato via Google Imagen.
 * Retorna data:image... se sucesso; fallback unsplash se falhar.
 */
export async function generateDishImageUrl(params: {
  title: string;
  subtitle?: string;
}): Promise<string> {
  const prompt = `Foto ultra realista, fotografia gastronômica profissional de: "${params.title}". ${params.subtitle || ""}. Luz suave, alta resolução, 4k.`;

  try {
    // @ts-ignore
    const res = await getAI().models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt,
      // @ts-ignore
      config: { numberOfImages: 1, aspectRatio: "16:9" },
    });

    const b64 =
      // @ts-ignore
      res?.generatedImages?.[0]?.image?.imageBytes ||
      // @ts-ignore
      res?.images?.[0]?.bytesBase64;

    if (b64) return `data:image/png;base64,${b64}`;
  } catch (e) {
    console.warn("Imagen falhou, usando fallback.", e);
  }

  const q = encodeURIComponent(`${params.title}, food, dish, prato pronto`);
  return `https://source.unsplash.com/1200x700/?${q}&sig=${Date.now()}`;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || "");
      const base64 = res.includes(",") ? res.split(",")[1] : res;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const scanReceipt = async (file: File): Promise<{ items: string[]; total: number }> => {
  const base64Data = await fileToBase64(file);

  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType: file.type } },
        { text: "Analise este cupom fiscal (recibo). Extraia a lista de itens comprados e o valor total da compra." },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista com os nomes dos produtos" },
          total: { type: Type.NUMBER, description: "Valor total pago" },
        },
        required: ["items", "total"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from model");
  return JSON.parse(text);
};

export const recognizeProduct = async (
  file: File
): Promise<{
  name: string;
  brand?: string;
  category: string;
  unit_price_guess?: number;
  quantity_guess?: number;
  confidence: number;
}> => {
  const base64Data = await fileToBase64(file);

  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType: file.type } },
        {
          text: `Você é um assistente de compras. Pela foto, identifique o produto do supermercado.
Retorne SOMENTE JSON seguindo o schema.
Se não tiver certeza do preço, chute unit_price_guess = 0.
Se não tiver certeza da quantidade, chute quantity_guess = 1.`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          brand: { type: Type.STRING },
          category: { type: Type.STRING },
          unit_price_guess: { type: Type.NUMBER },
          quantity_guess: { type: Type.NUMBER },
          confidence: { type: Type.NUMBER },
        },
        required: ["name", "category", "confidence"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from model");
  return JSON.parse(text);
};