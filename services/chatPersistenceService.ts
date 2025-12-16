import { supabase } from './supabaseClient';
import { aiMemoryService } from './aiMemoryService'; // Reusing your existing AI service for embeddings
import { Message, MessageRole, Session } from '../types';

export const chatPersistenceService = {
  
  /**
   * 1. RECOVER SESSION
   * Finds the last active session for the user so chat doesn't disappear on refresh.
   */
  async getLastActiveSession(userId: string): Promise<Session | null> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      startTime: new Date(data.created_at).getTime(),
      endTime: new Date(data.updated_at).getTime(),
      messages: [], // Messages fetched separately
      moodStart: data.mood
    };
  },

  /**
   * 2. CREATE SESSION
   */
  async createSession(userId: string): Promise<string> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: userId })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  },

  /**
   * 3. GET HISTORY
   * Fetches last 50 messages to refill the chat window.
   */
  async getChatHistory(sessionId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }

    return data.map((row: any) => {
      // Robust content extraction to prevent [object Object]
      let safeText = "";
      if (typeof row.content === 'string') {
          safeText = row.content;
      } else if (row.content && typeof row.content === 'object') {
          // If DB returned JSON object, try to extract text or stringify
          safeText = row.content.text || JSON.stringify(row.content);
      } else {
          safeText = String(row.content || "");
      }

      // Final cleanup if corrupted data persists
      if (safeText.includes("[object Object]")) {
          safeText = "(Message content unavailable)";
      }

      return {
        id: row.id,
        role: row.role,
        text: safeText,
        timestamp: new Date(row.created_at).getTime(),
        // Hydrate optional fields if stored in metadata
        audioBase64: row.metadata?.has_audio ? undefined : undefined, 
        groundingLinks: row.metadata?.grounding_links
      };
    });
  },

  /**
   * 4. SAVE MESSAGE (The Core Loop)
   * - Saves to DB
   * - If USER message -> Generates Embedding -> Saves to user_memory (RAG)
   */
  async saveMessage(userId: string, sessionId: string, message: Message): Promise<void> {
    // Ensure content is string before saving
    const safeContent = typeof message.text === 'string' ? message.text : JSON.stringify(message.text || "");

    // A. Insert into relational DB
    const { error } = await supabase.from('chat_messages').insert({
      id: message.id, // Ensure ID consistency
      session_id: sessionId,
      user_id: userId,
      role: message.role,
      content: safeContent,
      created_at: new Date(message.timestamp).toISOString(),
      metadata: {
        grounding_links: message.groundingLinks,
        has_audio: !!message.audioBase64
      }
    });

    if (error) console.error('Failed to save message:', error);

    // Update session timestamp
    await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);

    // B. RAG Memory Ingestion (Background Process)
    // Only memorize significant user inputs to save tokens/noise
    if (message.role === MessageRole.USER && safeContent.length > 15) {
      // Fire and forget - don't await this to keep UI snappy
      aiMemoryService.storeMemory(userId, safeContent, 'chat_log')
        .then(success => {
            if(success) console.log("🧠 Memory consolidated.");
        })
        .catch(err => console.error("Memory consolidation failed:", err));
    }
  }
};