
import { GoogleGenAI } from "@google/genai";
import { Language, StationData } from "../types";

const FREE_TIER_MODEL = "gemini-2.5-flash";

const getGeminiApiKey = (): string => {
  return (
    import.meta.env.VITE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    ""
  );
};

export const isGeminiConfigured = (): boolean => Boolean(getGeminiApiKey());

const mapGeminiError = (error: unknown, lang: Language): string => {
  const raw = error instanceof Error ? error.message : String(error || "");
  const msg = raw.toLowerCase();

  if (msg.includes("api key not valid") || msg.includes("api_key_invalid")) {
    return lang === "tr"
      ? "Gemini API anahtari gecersiz. Yeni bir key olusturup .env.local dosyasini guncelleyin."
      : "Gemini API key is invalid. Create a new key and update .env.local.";
  }

  if (msg.includes("quota") || msg.includes("rate") || msg.includes("429")) {
    return lang === "tr"
      ? "Gemini ucretsiz limitine ulasildi. Bir sure sonra tekrar deneyin."
      : "Gemini free-tier limit reached. Please try again later.";
  }

  if (msg.includes("permission") || msg.includes("forbidden") || msg.includes("403")) {
    return lang === "tr"
      ? "Gemini erisim izni reddedildi. Proje/API izinlerini kontrol edin."
      : "Gemini access was denied. Check project/API permissions.";
  }

  return lang === "tr"
    ? "Gemini baglantisinda bir hata olustu. Anahtar ve proje ayarlarinizi kontrol edin."
    : "A Gemini connection error occurred. Check your key and project settings.";
};

export const getHealthAdvice = async (
  data: StationData,
  lang: Language = "tr"
): Promise<string> => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return lang === "tr"
      ? "AI sağlık önerileri için Gemini API anahtarını ayarlayın."
      : "Set a Gemini API key to enable AI health advice.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
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

    const response = await ai.models.generateContent({
      model: FREE_TIER_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    if (response.text && response.text.trim()) {
      return response.text.trim();
    }

    return lang === "tr"
      ? "Sağlık önerileri şu anda alınamıyor. Lütfen yerel sağlık uyarılarını takip edin."
      : "Health recommendations are currently unavailable. Please follow local health guidance.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return mapGeminiError(error, lang);
  }
};

export const askHealthQuestion = async (
  data: StationData,
  question: string,
  lang: Language = "tr"
): Promise<string> => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return lang === "tr"
      ? "AI soru-cevap için Gemini API anahtarını ayarlayın."
      : "Set a Gemini API key to enable AI question answering.";
  }

  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    return lang === "tr"
      ? "Lutfen bir soru yazin."
      : "Please enter a question.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
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

    const response = await ai.models.generateContent({
      model: FREE_TIER_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    if (response.text && response.text.trim()) {
      return response.text.trim();
    }

    return lang === "tr"
      ? "Su anda yanit uretemedim. Birazdan tekrar dener misiniz?"
      : "I could not generate an answer right now. Please try again shortly.";
  } catch (error) {
    console.error("Gemini Q&A Error:", error);
    return mapGeminiError(error, lang);
  }
};
