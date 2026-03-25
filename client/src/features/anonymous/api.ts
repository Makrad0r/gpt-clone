import { apiFetch } from "../../lib/api";

export type AnonymousSession = {
  id: string;
  sessionToken: string;
  questionsUsed: number;
};

export function createAnonymousSession() {
  return apiFetch<AnonymousSession>("/anonymous/session", {
    method: "POST",
  });
}

export function getAnonymousMe() {
  return apiFetch<{ anonymousSession: AnonymousSession | null }>(
    "/anonymous/me",
  );
}
