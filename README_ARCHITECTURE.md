
# Sukoon AI - System Architecture & RAG Implementation

## 1. Interlinking the 3 Portals
The system relies on a single `users` table with a `role` column to define access.

### A. Student Portal (Role: `patient`)
*   **Access:** Can access Chat, Journal, and Therapist Directory.
*   **Interlink:**
    *   **Booking:** When a student books a session, a record is created in `transactions` (pending payment) and `appointments`.
    *   **Data Flow:** The student's chat logs create `memories` (vector data).
    *   **Visibility:** Students CANNOT see Therapist Notes or Admin Dashboards.

### B. Therapist Portal (Role: `therapist`)
*   **Access:** Dashboard, Schedule, My Patients, Wallet.
*   **Interlink:**
    *   **Patient Data:** Via `getTherapistPatients(therapistId)`, the system queries `transactions` to find which Students have booked this Therapist. It then grants read-access to that Student's basic profile.
    *   **Notes:** Therapists write to the `therapy_notes` table. This is **private** between the Therapist and the System (Student cannot see it).
    *   **Finance:** The `transactions` table feeds the "Wallet" view. A debit entry in `transactions` triggers a `payout_request` for Admins.

### C. Admin Portal (Role: `admin`)
*   **Access:** God-mode view of Users, Alerts, Finance, and Logs.
*   **Interlink:**
    *   **Alerts:** If the AI detects a crisis keyword (Client side), it pushes a row to the `feedback` table with type `safety_incident`. The Admin Dashboard polls this table real-time.
    *   **Vetting:** Admins see `therapists` where `is_verified` is false. Clicking "Approve" updates the record, making the Therapist visible to Students in the Directory.

---

## 2. RAG Base AI Chatbot (The Logic)

We use **Retrieval Augmented Generation** to give the AI long-term memory and context.

### The Flow:
1.  **Input:** User types: *"I'm feeling anxious about my exam again."*
2.  **Embedding (Vectorization):** 
    *   The backend takes this text and sends it to an embedding model (e.g., `text-embedding-004`).
    *   Result: A list of numbers (vector), e.g., `[0.12, -0.98, 0.44, ...]`.
3.  **Vector Search (The Retrieval):**
    *   Database Query: `SELECT content FROM memories ORDER BY embedding <-> '[0.12, -0.98...]' LIMIT 5;`
    *   The DB finds past memories mathematically similar to "anxiety" and "exams".
    *   *Result:* Found memory from 2 weeks ago: *"User has a math final on Dec 12th."*
4.  **Context Injection:**
    *   The System Prompt is updated dynamically before sending to Gemini.
    *   *Prompt:* `System: You are Sukoon. Context: The user has a math final on Dec 12th. User says: I'm anxious about my exam again.`
5.  **Generation:**
    *   Gemini generates a response: *"I hear you. Is this about the math final coming up on the 12th? Let's break down what's worrying you."*

### Implementation Steps in `dataService.ts`:
To switch from LocalStorage to Real RAG, update `retrieveContext`:

```typescript
// Pseudo-code for Real Implementation
export const retrieveContext = async (userId: string, query: string) => {
  // 1. Get Embedding for query
  const embedding = await ai.embedText(query);
  
  // 2. RPC Call to Supabase
  const { data: memories } = await supabase.rpc('match_memories', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: 5
  });
  
  // 3. Format
  return memories.map(m => m.content).join('\n');
}
```

## 3. Deployment Checklist
1.  Run the `supabase/schema.sql` in your Supabase SQL Editor.
2.  Enable Database Webhooks if you want real-time notifications for Admins.
3.  Update `dataService.ts` to replace the `MOCK_` arrays with `supabase.from('table').select('*')` calls.
