import { GoogleGenAI, Modality, Type } from "@google/genai";
import { SUKOON_SYSTEM_PROMPT, CRISIS_KEYWORDS } from "../constants";
import { aiMemoryService } from "./aiMemoryService"; 
import { TherapistStyle, PersonalityMode, Gender, Profession, TonePreference, Language } from "../types";

export const checkForCrisis = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
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

const safeString = (val: any) => {
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val || "");
};

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
  - Name: ${safeString(userProfile.name)}
  - Age: ${safeString(userProfile.age)}
  - Gender: ${safeString(userProfile.gender)}
  - Profession: ${safeString(userProfile.profession)}
  - Tone Preference: ${safeString(userProfile.tone)}
  - Preferred Language: ${safeString(userProfile.language)}
  `;

  const multilingualRules = `
  MULTILINGUAL RULES:
  - Detect the language of the user's message automatically.
  - If they write in ${safeString(userProfile.language)}, reply in ${safeString(userProfile.language)}.
  - If they mix languages (e.g. English + Urdu), reply in the dominant language.
  - Support: English, Urdu, Roman Urdu, Sindhi, Pashto, Siraiki, Arabic, Spanish.
  `;

  return `
  ${SUKOON_SYSTEM_PROMPT}

  CURRENT OPERATION PARAMETER:
  ${mode}

  ${userProfile.isAdmin ? '' : personalContext}
  ${userProfile.isAdmin ? '' : multilingualRules}

  ${userProfile.isAdmin ? '' : memoryContext}
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
  
  let memoryContext = "";
  
  // 1. RETRIEVAL PIPELINE (Read Path)
  if (memoryEnabled && !userProfile.isAdmin) {
      try {
          memoryContext = await aiMemoryService.retrieveContext(userId, latestUserMessage);
      } catch (err) {
          // Silent fail for memory retrieval to keep chat moving
      }
      
      // 2. INGESTION PIPELINE (Write Path)
      if (latestUserMessage.length > 20) {
          // Fire and forget storage
          aiMemoryService.storeMemory(userId, latestUserMessage, 'chat_log').catch(e => console.error("Memory Store Error", e));
      }
  }

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

    // Sanitized history to ensure string type and NO '[object Object]'
    const cleanHistory = history
      .map(m => {
        let txt = m.text;
        
        // Fix object types
        if (typeof txt === 'object') {
            try { txt = JSON.stringify(txt); } catch(e) { txt = ""; }
        }
        
        // Force string
        txt = String(txt || "");

        // Redact corrupted history
        if (txt.includes('[object Object]')) return null; 
        
        return {
            role: m.role,
            parts: [{ text: txt }] 
        };
      })
      .filter(Boolean) as { role: string, parts: { text: string }[] }[];

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        ...cleanHistory,
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

    // Extract text safely
    let textOutput = response.text;
    
    // Fallback if .text is missing but candidates exist (sanity check)
    if (!textOutput && response.candidates?.[0]?.content?.parts?.[0]?.text) {
        textOutput = response.candidates[0].content.parts[0].text;
    }

    // Final sanity check for return value
    if (!textOutput || typeof textOutput !== 'string') {
        textOutput = "I'm listening.";
    }
    
    // FIX: Ensure return value is always a string to prevent [object Object]
    const finalResponseText = typeof textOutput === 'string' ? textOutput : JSON.stringify(textOutput);

    return {
      text: finalResponseText,
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
        // Ensure text is clean string
        const safeText = typeof text === 'string' ? text : String(text);
        if (safeText.includes('[object Object]')) return undefined;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: safeText }] }],
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
            // FIX: contents must be an array of Content objects for correct API usage
            contents: [{
                parts: [
                    { inlineData: { mimeType: mimeType, data: audioBase64 } },
                    { text: "Transcribe this audio exactly." }
                ]
            }]
        });
        
        let text = response.text || "";
        // FIX: Ensure we never return an object
        return typeof text === 'string' ? text : JSON.stringify(text);
    } catch (e) {
        console.error("Transcription failed", e);
        return "";
    }
};