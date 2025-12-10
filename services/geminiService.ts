import { GoogleGenAI, Modality, Type } from "@google/genai";
import { SUKOON_SYSTEM_PROMPT, CRISIS_KEYWORDS } from "../constants";
import { retrieveContext } from "./ragService";
import { TherapistStyle, PersonalityMode, Gender, Profession, TonePreference, Language } from "../types";

export const checkForCrisis = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return CRISIS_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

let genAI: GoogleGenAI | null = null;

const getAI = () => {
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return genAI;
};

interface ChatResponse {
  text: string;
  audioBase64?: string;
  groundingLinks?: string[];
}

const buildSystemInstruction = (
  userProfile: {
      name: string;
      age: number;
      gender: Gender;
      profession: Profession;
      language: Language;
      tone: TonePreference;
      isAdmin?: boolean;
  },
  style: TherapistStyle,
  personality: PersonalityMode,
  memoryContext: string
) => {
    // Mode Selection
    const mode = userProfile.isAdmin ? 'mode: "admin"' : 'mode: "user"';

    const personalContext = `
  USER PROFILE:
  - Name: ${userProfile.name}
  - Age: ${userProfile.age}
  - Gender: ${userProfile.gender}
  - Profession: ${userProfile.profession}
  - Tone Preference: ${userProfile.tone}
  - Preferred Language: ${userProfile.language}
  `;

  const multilingualRules = `
  MULTILINGUAL RULES:
  - Detect the language of the user's message automatically.
  - If they write in ${userProfile.language}, reply in ${userProfile.language}.
  - If they mix languages (e.g. English + Urdu), reply in the dominant language.
  - Support: English, Urdu, Roman Urdu, Sindhi, Pashto, Siraiki, Arabic, Spanish.
  `;

  return `
  ${SUKOON_SYSTEM_PROMPT}

  CURRENT OPERATION PARAMETER:
  ${mode}

  ${userProfile.isAdmin ? '' : personalContext}
  ${userProfile.isAdmin ? '' : multilingualRules}

  ${userProfile.isAdmin ? '' : `AI INTERNAL THINKING (Do not output): Analyze emotional tone, stress indicators. ${memoryContext}`}
  `;
}

export const generateTherapistResponse = async (
  userId: string,
  history: { role: string; text: string }[],
  latestUserMessage: string,
  userProfile: {
      name: string;
      age: number;
      gender: Gender;
      profession: Profession;
      language: Language;
      tone: TonePreference;
      isAdmin?: boolean;
      deepMode?: boolean;
  },
  userLocation?: { lat: number; lng: number },
  style: TherapistStyle = 'gentle',
  personality: PersonalityMode = 'introvert',
  memoryEnabled: boolean = true
): Promise<ChatResponse> => {
  
  const ai = getAI();
  
  // Extract recent conversation history (last 5 user messages) to provide broader context for retrieval
  const conversationContext = history
    .filter(m => m.role === 'user')
    .slice(-5) 
    .map(m => m.text)
    .join(' ');

  const memoryContext = memoryEnabled ? retrieveContext(userId, latestUserMessage, conversationContext) : "";
  const systemInstruction = buildSystemInstruction(userProfile, style, personality, memoryContext);

  // Tools Configuration
  const toolConfig: any = {};
  const tools: any[] = [];

  // Maps Grounding - Only for non-admin, non-deep mode
  if (userLocation && !userProfile.deepMode && !userProfile.isAdmin) {
      tools.push({ googleMaps: {} });
      toolConfig.retrievalConfig = {
          latLng: {
              latitude: userLocation.lat,
              longitude: userLocation.lng
          }
      };
  }

  try {
    let modelName = 'gemini-2.5-flash';
    let config: any = {
        systemInstruction: systemInstruction,
    };

    if (userProfile.deepMode && !userProfile.isAdmin) {
        modelName = 'gemini-3-pro-preview';
        config.thinkingConfig = { thinkingBudget: 1024 };
    } else {
        config.tools = tools.length > 0 ? tools : undefined;
        config.toolConfig = tools.length > 0 ? toolConfig : undefined;
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        ...history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
        { role: 'user', parts: [{ text: latestUserMessage }] }
      ],
      config: config
    });

    let groundingLinks: string[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
        chunks.forEach((chunk: any) => {
             if (chunk.maps?.uri) {
                 groundingLinks.push(chunk.maps.uri);
             }
        });
    }

    return {
      text: response.text || "I'm listening.",
      groundingLinks: groundingLinks.length > 0 ? groundingLinks : undefined
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "I'm having a moment of connection trouble, but I'm here." };
  }
};

export const generateSpeech = async (text: string): Promise<string | undefined> => {
    const ai = getAI();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (e) {
        console.error("TTS generation failed", e);
        return undefined;
    }
}

export const transcribeAudio = async (audioBase64: string, mimeType: string = 'audio/wav'): Promise<string> => {
    const ai = getAI();
    try {
         const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeType, data: audioBase64 } },
                    { text: "Transcribe this audio exactly." }
                ]
            }
        });
        return response.text || "";
    } catch (e) {
        console.error("Transcription failed", e);
        return "";
    }
};