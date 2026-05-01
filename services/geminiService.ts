
import { GoogleGenAI } from "@google/genai";
import { Language, StationData } from "../types";

const GEMINI_MODEL = "gemini-2.5-flash";
const GROQ_MODEL   = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const getGeminiApiKey = (): string =>
  import.meta.env.VITE_GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.API_KEY ||
  "";

const getGroqApiKey = (): string =>
  import.meta.env.VITE_GROQ_API_KEY || "";

// Returns true when at least one AI provider is configured
export const isGeminiConfigured = (): boolean =>
  Boolean(getGeminiApiKey()) || Boolean(getGroqApiKey());

// ─── Groq (fetch-based, no SDK) ───────────────────────────────────────────────
const callGroq = async (prompt: string): Promise<string> => {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error("No Groq key");

  const res = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
      temperature: 0.5,
    }),
  });

  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
  const json = await res.json();
  const text: string = json.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("Groq empty response");
  return text.trim();
};

// ─── Gemini ──────────────────────────────────────────────────────────────────
const callGemini = async (prompt: string): Promise<string> => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("No Gemini key");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: { thinkingConfig: { thinkingBudget: 0 } },
  });

  const text = response.text?.trim() ?? "";
  if (!text) throw new Error("Gemini empty response");
  return text;
};

// ─── Unified caller with automatic fallback ───────────────────────────────────
const callAI = async (prompt: string): Promise<string | null> => {
  // 1. Try Gemini
  if (getGeminiApiKey()) {
    try {
      return await callGemini(prompt);
    } catch (err) {
      console.warn("Gemini failed, falling back to Groq:", err);
    }
  }
  // 2. Fallback: Groq
  if (getGroqApiKey()) {
    try {
      return await callGroq(prompt);
    } catch (err) {
      console.warn("Groq also failed:", err);
    }
  }
  return null;
};

// ─── Public API ──────────────────────────────────────────────────────────────
export const getHealthAdvice = async (
  data: StationData,
  lang: Language = "tr"
): Promise<string> => {
  if (!isGeminiConfigured()) {
    return lang === "tr"
      ? "AI sağlık önerileri için .env dosyasına VITE_GEMINI_API_KEY ekleyin."
      : "Add VITE_GEMINI_API_KEY to your .env file to enable AI health advice.";
  }

  const prompt = `Act as an environmental health expert.

Language: ${lang === "tr" ? "Turkish" : "English"}
City: ${data.city.name}
AQI: ${data.aqi}
PM2.5: ${data.iaqi.pm25?.v ?? "N/A"}
PM10: ${data.iaqi.pm10?.v ?? "N/A"}
Ozone (O3): ${data.iaqi.o3?.v ?? "N/A"}
Nitrogen Dioxide (NO2): ${data.iaqi.no2?.v ?? "N/A"}
Temperature: ${data.iaqi.t?.v ?? "N/A"}°C

Return exactly 3 short sentences:
1) Advice for general public
2) Advice for sensitive groups (asthma, children, elderly)
3) Practical precaution (mask/windows/outdoor activity)

Do not use markdown or bullet points.`;

  const result = await callAI(prompt);
  return (
    result ??
    (lang === "tr"
      ? "Sağlık önerileri şu anda alınamıyor. Lütfen yerel sağlık uyarılarını takip edin."
      : "Health recommendations are currently unavailable. Please follow local health guidance.")
  );
};

export const askHealthQuestion = async (
  data: StationData,
  question: string,
  lang: Language = "tr"
): Promise<string> => {
  if (!isGeminiConfigured()) {
    return lang === "tr"
      ? "AI soru-cevap için .env dosyasına VITE_GEMINI_API_KEY ekleyin."
      : "Add VITE_GEMINI_API_KEY to your .env file to enable AI Q&A.";
  }

  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    return lang === "tr" ? "Lütfen bir soru yazın." : "Please enter a question.";
  }

  const prompt = `You are an environmental health assistant.

Language: ${lang === "tr" ? "Turkish" : "English"}
City: ${data.city.name}
AQI: ${data.aqi}
PM2.5: ${data.iaqi.pm25?.v ?? "N/A"}
PM10: ${data.iaqi.pm10?.v ?? "N/A"}
Ozone (O3): ${data.iaqi.o3?.v ?? "N/A"}
Nitrogen Dioxide (NO2): ${data.iaqi.no2?.v ?? "N/A"}
Temperature: ${data.iaqi.t?.v ?? "N/A"}°C

User question: ${trimmedQuestion}

Give a concise practical answer in 2-4 sentences.
Do not use markdown.`;

  const result = await callAI(prompt);
  return (
    result ??
    (lang === "tr"
      ? "Şu anda yanıt üretemiyorum. Birazdan tekrar dener misiniz?"
      : "I could not generate an answer right now. Please try again shortly.")
  );
};
