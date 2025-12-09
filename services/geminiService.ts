import { GoogleGenAI, Modality, Type } from "@google/genai";
import { SAKOON_SYSTEM_PROMPT, CRISIS_KEYWORDS } from "../constants";
import { retrieveContext } from "./ragService";
import { TherapistStyle, PersonalityMode, Gender, Profession, TonePreference, Language, AIResponseStyle } from "../types";

export type CrisisType = 'SELF_HARM' | 'HARM_TO_OTHERS' | 'EMOTIONAL_DISTRESS' | null;

const SELF_HARM_KEYWORDS = ["kill myself", "suicide", "want to die", "end my life", "done living", "cut myself", "no reason to live", "better off dead"];
const HARM_OTHERS_KEYWORDS = ["kill him", "kill her", "kill them", "hurt someone", "violence", "attack", "murder", "beat him", "beat her"];
const DISTRESS_KEYWORDS = ["empty", "cannot control", "depressed", "unstable", "broken", "sad", "hopeless", "mentally unstable", "panic", "falling apart"];

export const detectCrisisType = (text: string): CrisisType => {
  const lowerText = text.toLowerCase();
  
  if (SELF_HARM_KEYWORDS.some(k => lowerText.includes(k))) return 'SELF_HARM';
  if (HARM_OTHERS_KEYWORDS.some(k => lowerText.includes(k))) return 'HARM_TO_OTHERS';
  if (DISTRESS_KEYWORDS.some(k => lowerText.includes(k))) return 'EMOTIONAL_DISTRESS';
  
  return null;
};

// Kept for backward compatibility if needed, but detectCrisisType is preferred
export const checkForCrisis = (text: string): boolean => {
  return detectCrisisType(text) !== null;
};

let genAI: GoogleGenAI | null = null;

const getAI = () => {
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return genAI;
};

// Generates a sanitized summary for admin logs
export const generateSafetySummary = async (userText: string, category: string): Promise<string> => {
    const ai = getAI();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `
                You are a safety officer. Write a ONE-SENTENCE, professional, neutral summary of the following user message for an admin log.
                Category: ${category}
                
                Rules:
                - Do NOT use the exact words of the user.
                - Do NOT describe specific methods of harm.
                - Do NOT include PII (names, places).
                - Be objective and clinical.
                - Example: "User expressed severe hopelessness and suicidal ideation."
                
                User Message: "${userText}"
            `,
        });
        return response.text.trim();
    } catch (e) {
        return `User flagged for ${category} (Auto-log)`;
    }
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
      aiResponseStyle: AIResponseStyle;
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

  // --- NEW PERSONALITY ENGINE ---
  let personalityInstruction = "";
  switch(userProfile.aiResponseStyle) {
      case 'Empathetic':
          personalityInstruction = `
          CORE PERSONALITY: EMPATHETIC
          - Prioritize validation and emotional mirroring.
          - Use warm, comforting language.
          - Focus on feelings before solutions.
          - Phrase suggestions as gentle invitations (e.g., "I wonder if...").
          - Goal: Make the user feel deeply heard and understood.
          `;
          break;
      case 'Direct':
          personalityInstruction = `
          CORE PERSONALITY: DIRECT
          - Be concise, clear, and action-oriented.
          - Avoid fluff or excessive validation.
          - Focus on practical steps and solutions.
          - Use bullet points if listing ideas.
          - Goal: Help the user solve the problem efficiently.
          `;
          break;
      case 'Analytical':
          personalityInstruction = `
          CORE PERSONALITY: ANALYTICAL
          - Focus on logic, patterns, and objective observation.
          - Help the user analyze *why* they might feel this way.
          - Use precise language.
          - Break down complex emotions into manageable parts.
          - Goal: Help the user gain intellectual clarity and insight.
          `;
          break;
      default: 
          personalityInstruction = "CORE PERSONALITY: EMPATHETIC";
  }

  const multilingualRules = `
  MULTILINGUAL RULES:
  - Detect the language of the user's message automatically.
  - If they write in ${userProfile.language}, reply in ${userProfile.language}.
  - If they mix languages (e.g. English + Urdu), reply in the dominant language.
  - Support: English, Urdu, Roman Urdu, Sindhi, Pashto, Siraiki, Arabic, Spanish.
  `;
  
  // Improved Memory Instruction
  const contextRules = memoryContext ? `
  RECALL PROTOCOL:
  The following is retrieved context about the user from previous conversations or journals. 
  - Use this information to make the conversation feel continuous and personal.
  - If a specific name, event, or feeling is mentioned in [LONG-TERM MEMORY], reference it gently if relevant.
  - If [RECENT JOURNAL ENTRIES] are provided, acknowledge their recent mood or reflections without being creepy.
  
  RETRIEVED CONTEXT:
  ${memoryContext}
  ` : "";

  return `
  ${SAKOON_SYSTEM_PROMPT}

  CURRENT OPERATION PARAMETER:
  ${mode}

  ${userProfile.isAdmin ? '' : personalContext}
  ${userProfile.isAdmin ? '' : personalityInstruction}
  ${userProfile.isAdmin ? '' : multilingualRules}
  ${userProfile.isAdmin ? '' : contextRules}

  ${userProfile.isAdmin ? '' : `AI INTERNAL THINKING (Do not output): Analyze emotional tone, stress indicators.`}
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
      aiResponseStyle: AIResponseStyle;
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