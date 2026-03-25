import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createAnonymousSession, getAnonymousMe } from "./api";
import {
  getAnonymousSessionToken,
  setAnonymousSessionToken,
} from "../../lib/anonymous";

export function useEnsureAnonymousSession(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    async function ensureSession() {
      if (!enabled) {
        return;
      }

      const existingToken = getAnonymousSessionToken();

      if (existingToken) {
        await queryClient.invalidateQueries({ queryKey: ["anonymous-me"] });
        return;
      }

      const session = await createAnonymousSession();
      setAnonymousSessionToken(session.sessionToken);

      await queryClient.invalidateQueries({ queryKey: ["anonymous-me"] });
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
    }

    void ensureSession();
  }, [enabled, queryClient]);
}

export function useAnonymousMe(enabled: boolean) {
  return useQuery({
    queryKey: ["anonymous-me"],
    queryFn: getAnonymousMe,
    enabled,
    retry: false,
  });
}
