
import { GoogleGenAI, Type } from "@google/genai";
import { StationData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getHealthAdvice = async (data: StationData): Promise<string> => {
  try {
    const prompt = `Act as an environmental health expert. Analyze this air quality data:
    City: ${data.city.name}
    AQI: ${data.aqi}
    PM2.5: ${data.iaqi.pm25?.v || 'N/A'}
    PM10: ${data.iaqi.pm10?.v || 'N/A'}
    Ozone (O3): ${data.iaqi.o3?.v || 'N/A'}
    Nitrogen Dioxide (NO2): ${data.iaqi.no2?.v || 'N/A'}
    Temperature: ${data.iaqi.t?.v || 'N/A'}°C

    Provide a concise, professional 3-sentence health advisory for:
    1. General public
    2. Sensitive groups (asthma, children, elderly)
    3. Practical precautions (masks, windows, outdoor activity).
    
    Keep it friendly and informative.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text || "Health recommendations are currently unavailable. Please follow local guidelines.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The air quality level suggests following standard health precautions. If you have respiratory issues, stay indoors.";
  }
};
