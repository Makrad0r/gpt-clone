import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";

type RealtimeParams = {
  identityKey: string | null;
  activeChatId?: string;
  enabled: boolean;
};

export function useChatsRealtime({
  identityKey,
  activeChatId,
  enabled,
}: RealtimeParams) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !identityKey) {
      return;
    }

    const chatsChannel = supabase
      .channel(`realtime-chats-${identityKey}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chats",
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: ["chats", identityKey],
          });
        },
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`realtime-messages-${identityKey}-${activeChatId ?? "none"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const row =
            (payload.new as { chat_id?: string } | null) ??
            (payload.old as { chat_id?: string } | null);

          if (row?.chat_id && row.chat_id === activeChatId) {
            void queryClient.invalidateQueries({
              queryKey: ["messages", identityKey, activeChatId],
            });
          }

          void queryClient.invalidateQueries({
            queryKey: ["chats", identityKey],
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(chatsChannel);
      void supabase.removeChannel(messagesChannel);
    };
  }, [enabled, identityKey, activeChatId, queryClient]);
}
