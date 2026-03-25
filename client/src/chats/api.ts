import { apiFetch } from "../lib/api.ts";

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
    body: JSON.stringify(
      title
        ? {
            title,
          }
        : {},
    ),
  });
}

export function getMessages(chatId: string) {
  return apiFetch<Message[]>(`/chats/${chatId}/messages`);
}
