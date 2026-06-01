import { supabase } from "@/lib/supabase";
import type { ChatMessage, ChatSession } from "./types";

const SESSIONS_KEY = "ai_chat_sessions";

export function loadSessions(): ChatSession[] {
  const saved = localStorage.getItem(SESSIONS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      /* fall through */
    }
  }
  return [
    {
      id: `session-${Date.now()}`,
      title: "Career Coach",
      date: new Date().toLocaleDateString(),
    },
  ];
}

export function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export async function persistNewSession(userId: string, session: ChatSession, isMockMode?: boolean) {
  if (isMockMode) return;
  try {
    const { error } = await supabase.from("coach_chat_sessions").insert({
      id: session.id,
      user_id: userId,
      title: session.title,
    });
    if (error) throw error;
  } catch (err) {
    console.warn("Failed to persist session to backend:", err);
  }
}

export async function renameSessionInBackend(userId: string, sessionId: string, newTitle: string, isMockMode?: boolean) {
  if (isMockMode) return;
  try {
    const { error } = await supabase
      .from("coach_chat_sessions")
      .update({ title: newTitle })
      .eq("id", sessionId)
      .eq("user_id", userId);
    if (error) throw error;
  } catch (err) {
    console.warn("Failed to rename session in backend:", err);
  }
}

export async function deleteSessionInBackend(userId: string, sessionId: string, isMockMode?: boolean) {
  if (isMockMode) return;
  try {
    const { error } = await supabase
      .from("coach_chat_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", userId);
    if (error) throw error;
  } catch (err) {
    console.warn("Failed to delete session in backend:", err);
  }
}

export async function loadSessionsFromBackend(userId: string, isMockMode?: boolean): Promise<ChatSession[] | null> {
  if (isMockMode || !userId) return null;
  try {
    const { data, error } = await supabase
      .from("coach_chat_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (data && data.length > 0) {
      return data.map((row) => ({
        id: row.id,
        title: row.title,
        date: new Date(row.created_at).toLocaleDateString(),
      }));
    }
  } catch (err) {
    console.warn("Failed to load sessions from backend:", err);
  }
  return null;
}

export function loadMessages(sessionId: string): ChatMessage[] {
  const saved = localStorage.getItem(`ai_chat_messages_${sessionId}`);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

export function saveMessages(sessionId: string, messages: ChatMessage[]) {
  localStorage.setItem(`ai_chat_messages_${sessionId}`, JSON.stringify(messages));
}

export async function persistMessageToBackend(
  userId: string,
  sessionId: string,
  role: "user" | "assistant",
  message: string,
  actionType?: string,
  isMockMode?: boolean,
): Promise<void> {
  if (isMockMode) return;
  try {
    // Try inserting with session_id first
    const { error } = await supabase.from("chat_messages").insert({
      user_id: userId,
      session_id: sessionId,
      role,
      message,
    });
    if (error) {
      // If error points to missing column session_id, try conversation_id
      if (error.message.includes("session_id") || error.code === "P0002" || error.code === "42703") {
        const fallbackRes = await supabase.from("chat_messages").insert({
          user_id: userId,
          conversation_id: sessionId,
          role,
          message,
        } as Record<string, unknown>);
        if (fallbackRes.error) throw fallbackRes.error;
      } else {
        throw error;
      }
    }
  } catch (err) {
    console.warn("Failed to insert into chat_messages, trying chat_history fallback...", err);
    try {
      await supabase.from("chat_history").insert({
        user_id: userId,
        role,
        message,
        coach_session_id: sessionId,
        action_type: actionType || null,
      } as Record<string, unknown>);
    } catch (fallbackErr) {
      console.warn("chat_history fallback sync skipped:", fallbackErr);
    }
  }
}

export async function loadMessagesFromBackend(
  userId: string,
  sessionId: string,
  isMockMode: boolean,
): Promise<ChatMessage[] | null> {
  if (isMockMode) return null;
  try {
    const { data: messages, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (!error && messages?.length) {
      const sessionMessages = messages.filter(
        (row) => row.session_id === sessionId || row.conversation_id === sessionId
      );
      return sessionMessages.map((row) => ({
        id: row.id as string,
        sender: row.role === "assistant" ? "ai" : "user",
        text: (row.message as string) || "",
        timestamp: new Date(row.created_at as string).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));
    }
  } catch (err) {
    console.warn("chat_messages load exception, trying chat_history fallback...", err);
  }

  // Fallback to chat_history
  try {
    const { data, error } = await supabase
      .from("chat_history")
      .select("*")
      .eq("user_id", userId)
      .eq("coach_session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error || !data?.length) return null;

    return data.map((row) => ({
      id: row.id as string,
      sender: row.role === "assistant" ? "ai" : "user",
      text: (row.message as string) || "",
      timestamp: new Date(row.created_at as string).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
  } catch {
    return null;
  }
}

export async function clearBackendSession(
  userId: string,
  sessionId: string,
  isMockMode: boolean,
): Promise<void> {
  if (isMockMode) return;
  try {
    let result = await supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", userId)
      .eq("session_id", sessionId);

    if (result.error && (result.error.message.includes("session_id") || result.error.code === "42703")) {
      await supabase
        .from("chat_messages")
        .delete()
        .eq("user_id", userId)
        .eq("conversation_id", sessionId);
    }
  } catch (err) {
    console.warn("chat_messages clear failed, trying chat_history fallback...", err);
  }
  try {
    await supabase
      .from("chat_history")
      .delete()
      .eq("user_id", userId)
      .eq("coach_session_id", sessionId);
  } catch {
    /* ignore */
  }
}
