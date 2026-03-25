import { supabase } from "./supabase";
import { getAnonymousSessionToken } from "./anonymous";

const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl) {
  throw new Error("Missing VITE_API_URL");
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init?.headers);

  if (!(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  } else {
    const anonymousSessionToken = getAnonymousSessionToken();

    if (anonymousSessionToken) {
      headers.set("x-anonymous-session-token", anonymousSessionToken);
    }
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json();
}
