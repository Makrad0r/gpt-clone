import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useChats, useCreateChat, useMessages } from "../features/chats/hooks";
import { streamMessage } from "../features/chats/api";
import {
  useAnonymousMe,
  useEnsureAnonymousSession,
} from "../features/anonymous/hooks";
import { uploadChatImage } from "../features/uploads/api";
import { useChatsRealtime } from "../features/chats/realtime";
import { clearAnonymousSessionToken } from "../lib/anonymous";

export function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { user, loading } = useAuth();

  useEnsureAnonymousSession(!loading && !user);

  const anonymousMeQuery = useAnonymousMe(!loading && !user);
  const anonymousSession = anonymousMeQuery.data?.anonymousSession ?? null;
  const identityKey = user
    ? `user:${user.id}`
    : anonymousSession
      ? `guest:${anonymousSession.id}`
      : null;
  useChatsRealtime({
    identityKey,
    activeChatId: chatId,
    enabled: !loading,
  });
  const guestLimitReached = (anonymousSession?.questionsUsed ?? 0) >= 3;

  const chatsQuery = useChats(identityKey, !loading);
  const createChatMutation = useCreateChat(identityKey);
  const messagesQuery = useMessages(identityKey, chatId, !!chatId && !loading);

  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const chats = useMemo(() => chatsQuery.data ?? [], [chatsQuery.data]);

  useEffect(() => {
    if (identityKey) {
      void queryClient.invalidateQueries({ queryKey: ["chats", identityKey] });
    }
  }, [identityKey, queryClient]);

  async function handleLogout() {
    await supabase.auth.signOut();

    clearAnonymousSessionToken();

    queryClient.removeQueries({ queryKey: ["chats"] });
    queryClient.removeQueries({ queryKey: ["messages"] });
    queryClient.removeQueries({ queryKey: ["anonymous-me"] });

    navigate("/");
  }

  async function handleCreateChat() {
    if (!user && !anonymousSession) {
      setSendError("Guest session is still initializing. Please try again.");
      return;
    }

    const chat = await createChatMutation.mutateAsync(undefined);
    navigate(`/chat/${chat.id}`);
  }

  async function handleUploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setSendError("Only image files are allowed.");
      return;
    }

    setSendError(null);
    setIsUploadingImage(true);

    try {
      const uploadedUrl = await uploadChatImage(file);
      setImageUrl(uploadedUrl);
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "Image upload failed",
      );
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await handleUploadFile(file);
    event.target.value = "";
  }

  async function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(event.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith("image/"));

    if (!imageItem) {
      return;
    }

    const file = imageItem.getAsFile();

    if (!file) {
      return;
    }

    event.preventDefault();
    await handleUploadFile(file);
  }

  async function handleSendMessage() {
    if ((!input.trim() && !imageUrl) || !chatId || isStreaming) {
      return;
    }

    if (!user && guestLimitReached) {
      setSendError("Free guest limit reached. Please sign in.");
      return;
    }

    const content = input.trim() || "Please analyze the attached image.";

    setInput("");
    setStreamingText("");
    setIsStreaming(true);
    setSendError(null);

    const currentImageUrl = imageUrl;
    setImageUrl(null);

    try {
      await streamMessage({
        chatId,
        content,
        imageUrl: currentImageUrl ?? undefined,
        onChunk: (chunk) => {
          setStreamingText((prev) => prev + chunk);
        },
      });

      await queryClient.invalidateQueries({ queryKey: ["chats", identityKey] });
      await queryClient.invalidateQueries({ queryKey: ["anonymous-me"] });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Streaming failed";
      setSendError(message);

      if (currentImageUrl) {
        setImageUrl(currentImageUrl);
      }

      await queryClient.invalidateQueries({ queryKey: ["anonymous-me"] });
    } finally {
      setIsStreaming(false);
      setStreamingText("");
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <aside className="w-80 border-r border-slate-800 bg-slate-900 p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Chats</h2>
          <button
            onClick={handleCreateChat}
            disabled={
              createChatMutation.isPending ||
              (!user && anonymousMeQuery.isLoading)
            }
            className="rounded-lg bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600 disabled:opacity-60"
          >
            {createChatMutation.isPending
              ? "Creating..."
              : !user && anonymousMeQuery.isLoading
                ? "Preparing..."
                : "New chat"}
          </button>
        </div>

        {chatsQuery.isLoading ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
            Loading chats...
          </div>
        ) : chats.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
            No chats yet
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => {
              const isActive = chat.id === chatId;

              return (
                <button
                  key={chat.id}
                  onClick={() => navigate(`/chat/${chat.id}`)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    isActive
                      ? "border-blue-500 bg-slate-800"
                      : "border-slate-800 bg-slate-950 hover:bg-slate-800"
                  }`}
                >
                  <div className="truncate text-sm font-medium text-white">
                    {chat.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {new Date(chat.updated_at).toLocaleString()}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {user ? (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm">
            <div className="text-slate-300">Logged in as</div>
            <div className="mt-1 break-all font-medium text-white">
              {user.email}
            </div>

            <button
              onClick={handleLogout}
              className="mt-3 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm">
            <div className="text-slate-300">Guest mode</div>
            <div className="mt-1 text-slate-500">
              {anonymousMeQuery.isLoading
                ? "Loading guest session..."
                : `${anonymousSession?.questionsUsed ?? 0} / 3 free questions used`}
            </div>

            <Link
              to="/auth"
              className="mt-3 block rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-blue-500"
            >
              Sign in
            </Link>
          </div>
        )}
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl">
            {!chatId ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <h1 className="text-xl font-semibold text-white">Welcome</h1>
                <p className="mt-2 text-slate-400">
                  Create a new chat to start messaging.
                </p>
              </div>
            ) : messagesQuery.isLoading ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
                Loading messages...
              </div>
            ) : messagesQuery.isError ? (
              <div className="rounded-2xl border border-red-900 bg-red-950/40 p-6 text-red-300">
                Failed to load messages.
              </div>
            ) : (
              <div className="space-y-4">
                {(messagesQuery.data ?? []).map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-2xl border p-4 ${
                      message.role === "user"
                        ? "border-blue-900 bg-blue-950/30"
                        : "border-slate-800 bg-slate-900"
                    }`}
                  >
                    <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                      {message.role}
                    </div>
                    <div className="whitespace-pre-wrap text-slate-100">
                      {message.content}
                    </div>
                    {message.image_url ? (
                      <img
                        src={message.image_url}
                        alt="attachment"
                        className="mt-3 max-h-80 rounded-xl border border-slate-700"
                      />
                    ) : null}
                  </div>
                ))}

                {isStreaming ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                      assistant
                    </div>

                    <div className="whitespace-pre-wrap text-slate-100">
                      {streamingText.length === 0 ? (
                        <span className="text-slate-400">Thinking...</span>
                      ) : (
                        streamingText
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-800 p-4">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-3">
              {!user && guestLimitReached ? (
                <div className="mb-3 rounded-xl border border-amber-900 bg-amber-950/40 px-3 py-2 text-sm text-amber-300">
                  Free guest limit reached. Sign in to continue.
                </div>
              ) : null}

              {sendError ? (
                <div className="mb-3 rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                  {sendError}
                </div>
              ) : null}

              {imageUrl ? (
                <div className="mb-3 rounded-xl border border-slate-700 p-3">
                  <img
                    src={imageUrl}
                    alt="preview"
                    className="max-h-56 rounded-xl border border-slate-700"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                    >
                      Remove image
                    </button>
                  </div>
                </div>
              ) : null}

              <textarea
                rows={3}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={handlePaste}
                disabled={
                  !chatId ||
                  isStreaming ||
                  isUploadingImage ||
                  (!user && guestLimitReached)
                }
                placeholder={
                  chatId
                    ? "Send a message or paste an image..."
                    : "Create a chat first..."
                }
                className="w-full resize-none bg-transparent outline-none placeholder:text-slate-500 disabled:cursor-not-allowed"
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!chatId || isStreaming || isUploadingImage}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploadingImage ? "Uploading..." : "Attach image"}
                </button>

                <button
                  onClick={handleSendMessage}
                  disabled={
                    !chatId ||
                    (!input.trim() && !imageUrl) ||
                    isStreaming ||
                    isUploadingImage ||
                    (!user && guestLimitReached)
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isStreaming ? "Generating..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
