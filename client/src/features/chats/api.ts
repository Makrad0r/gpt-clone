import { supabase } from "../../lib/supabase";
import { apiFetch } from "../../lib/api";
import { getAnonymousSessionToken } from "../../lib/anonymous";

const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl) {
  throw new Error("Missing VITE_API_URL");
}

export type Chat = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  chat_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  image_url: string | null;
  created_at: string;
};

export function getChats() {
  return apiFetch<Chat[]>("/chats");
}

export function createChat(title?: string) {
  return apiFetch<Chat>("/chats", {
    method: "POST",
    body: JSON.stringify(title ? { title } : {}),
  });
}

export function getMessages(chatId: string) {
  return apiFetch<Message[]>(`/chats/${chatId}/messages`);
}

export async function streamMessage(params: {
  chatId: string;
  content: string;
  imageUrl?: string;
  onChunk: (chunk: string) => void;
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  } else {
    const anonymousSessionToken = getAnonymousSessionToken();

    if (anonymousSessionToken) {
      headers.set("x-anonymous-session-token", anonymousSessionToken);
    }
  }

  const response = await fetch(
    `${apiUrl}/chats/${params.chatId}/messages/stream`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        content: params.content,
        imageUrl: params.imageUrl,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Streaming response body is missing");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    params.onChunk(decoder.decode(value, { stream: true }));
  }
}
