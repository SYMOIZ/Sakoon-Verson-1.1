import { GoogleGenAI } from "@google/genai";
import { supabase } from "./supabaseClient";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const aiMemoryService = {
  /**
   * INGESTION STEP 2: Generate Vector Embedding
   * Model: text-embedding-004 (768 Dimensions)
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    // 1. Strict Input Validation
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return null;
    }

    // Prevent embedding corrupted data
    if (text.includes('[object Object]')) {
        console.warn("Skipping embedding of corrupted text: [object Object]");
        return null;
    }

    try {
      // 2. Standard Single Embedding Call
      // Use 'contents' for embedContent as per SDK types
      const response = await ai.models.embedContent({
        model: "text-embedding-004",
        contents: { parts: [{ text: text.trim() }] },
      });

      return response.embeddings?.[0]?.values || null;
    } catch (error) {
      console.error("Embedding generation failed:", error);
      return null;
    }
  },

  /**
   * INGESTION STEP 3: Store in Vector DB
   * Trigger: Chat Message, Journal Entry, or Bio update.
   */
  async storeMemory(userId: string, content: string, sourceType: 'chat_log' | 'clinical_note' | 'bio' = 'chat_log'): Promise<boolean> {
    // 1. Input Sanitization
    if (!content) return false;
    
    // Ensure content is a string
    let safeContent = content;
    if (typeof content !== 'string') {
        try {
            safeContent = JSON.stringify(content);
        } catch (e) {
            return false;
        }
    }

    // Prevent storing "[object Object]" literally or empty strings
    if (safeContent.includes("[object Object]") || safeContent.trim().length < 5) {
        return false;
    }

    // 2. Generate Embedding
    const embedding = await this.generateEmbedding(safeContent);
    
    if (!embedding) return false;

    // 3. Insert into Supabase `user_memory` table
    const { error } = await supabase.from('user_memory').insert({
      user_id: userId,
      content: safeContent,
      embedding,
      source_type: sourceType,
      created_at: new Date().toISOString()
    });

    if (error) {
      // Suppress logs for expected errors in development (e.g. table missing)
      if (!error.message.includes("relation") && !error.message.includes("does not exist")) {
          console.error("Failed to store memory in Supabase:", error);
      }
      return false;
    }
    return true;
  },

  /**
   * RETRIEVAL PIPELINE: Read Path
   * Trigger: User asks a question.
   * Action: Cosine Similarity Search -> Context Injection.
   */
  async retrieveContext(userId: string, query: string): Promise<string> {
    if (!query || typeof query !== 'string') return "";

    // 1. Convert query to vector
    const embedding = await this.generateEmbedding(query);
    
    if (!embedding) return "";

    // 2. Execute Similarity Search (RPC call to `match_user_memory`)
    const { data: memories, error } = await supabase.rpc('match_user_memory', {
      query_embedding: embedding,
      match_threshold: 0.65, // Slightly lower threshold to catch broad concepts
      match_count: 5,        // Top 5 relevant memories
      filter_user_id: userId
    });

    if (error) {
      return "";
    }

    if (!memories || !Array.isArray(memories) || memories.length === 0) return "";

    // 3. Format: System: You know this about the user: [Memory 1], [Memory 2]...
    // FIX: Explicitly handle content type to prevent "[object Object]"
    const memoryList = memories
        .map((m: any) => {
            if (!m || !m.content) return null;
            
            // Force content to string if it's JSON/Object
            let textContent = m.content;
            if (typeof textContent === 'object') {
                try {
                    textContent = JSON.stringify(textContent);
                } catch (e) {
                    return null;
                }
            }
            
            // Stringify if strictly not a string yet
            textContent = String(textContent);

            // Filter corrupt memories
            if (textContent.includes('[object Object]')) return null; 
            
            return `[${textContent}]`;
        })
        .filter(Boolean)
        .join(', ');
    
    if (!memoryList) return "";
    
    return `System: You know this about the user: ${memoryList}`;
  }
};