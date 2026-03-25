import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createChat, getChats, getMessages } from "./api";

export function useChats(identityKey: string | null, enabled = true) {
  return useQuery({
    queryKey: ["chats", identityKey],
    queryFn: getChats,
    enabled: enabled && !!identityKey,
  });
}

export function useCreateChat(identityKey: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title?: string) => createChat(title),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chats", identityKey] });
    },
  });
}

export function useMessages(
  identityKey: string | null,
  chatId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["messages", identityKey, chatId],
    queryFn: () => getMessages(chatId!),
    enabled: enabled && !!identityKey && !!chatId,
  });
}
