import { supabase } from "../../lib/supabase";

export async function uploadChatImage(file: File) {
  const extension = file.name.split(".").pop() || "png";
  const filePath = `chat-images/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("chat-images")
    .upload(filePath, file, {
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from("chat-images").getPublicUrl(filePath);

  return data.publicUrl;
}
