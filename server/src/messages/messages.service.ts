import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { OpenAiService } from '../openai/openai.service';

type ChatRow = {
  id: string;
  user_id: string | null;
  anonymous_session_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image_url: string | null;
  created_at: string;
};

@Injectable()
export class MessagesService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly openAiService: OpenAiService,
  ) {}

  async getOwnedUserChat(chatId: string, userId: string): Promise<ChatRow> {
    const result = await this.supabaseService.admin
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .maybeSingle();

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }

    const chat = (result.data as ChatRow | null) ?? null;

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this chat');
    }

    return chat;
  }

  async getOwnedAnonymousChat(
    chatId: string,
    anonymousSessionId: string,
  ): Promise<ChatRow> {
    const result = await this.supabaseService.admin
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .maybeSingle();

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }

    const chat = (result.data as ChatRow | null) ?? null;

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.anonymous_session_id !== anonymousSessionId) {
      throw new ForbiddenException('You do not have access to this chat');
    }

    return chat;
  }

  async getChatMessages(chatId: string): Promise<MessageRow[]> {
    const result = await this.supabaseService.admin
      .from('messages')
      .select('id, chat_id, role, content, image_url, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }

    return (result.data as MessageRow[] | null) ?? [];
  }

  async saveUserMessage(chatId: string, content: string, imageUrl?: string) {
    const result = await this.supabaseService.admin
      .from('messages')
      .insert({
        chat_id: chatId,
        role: 'user',
        content,
        image_url: imageUrl ?? null,
      })
      .select('id, chat_id, role, content, image_url, created_at')
      .single();

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }

    return result.data;
  }

  async saveAssistantMessage(chatId: string, content: string) {
    const result = await this.supabaseService.admin
      .from('messages')
      .insert({
        chat_id: chatId,
        role: 'assistant',
        content,
      })
      .select('id, chat_id, role, content, image_url, created_at')
      .single();

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }

    return result.data;
  }

  async touchChat(chatId: string) {
    const result = await this.supabaseService.admin
      .from('chats')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', chatId);

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }
  }

  async renameChatIfNeeded(
    chatId: string,
    currentTitle: string,
    content: string,
  ) {
    if (currentTitle !== 'New chat') {
      return;
    }

    const nextTitle = content.trim().slice(0, 60) || 'New chat';

    const result = await this.supabaseService.admin
      .from('chats')
      .update({
        title: nextTitle,
      })
      .eq('id', chatId);

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }
  }

  buildOpenAiMessages(history: MessageRow[]): Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    imageUrl?: string | null;
  }> {
    return [
      {
        role: 'system',
        content:
          'You are a helpful AI assistant. If the user attached an image, analyze what is visible in the image and answer their question about it.',
      },
      ...history
        .filter(
          (message) => message.role === 'user' || message.role === 'assistant',
        )
        .map((message) => ({
          role: message.role,
          content: message.content,
          imageUrl: message.role === 'user' ? message.image_url : null,
        })),
    ];
  }

  streamAssistantReply(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  ) {
    return this.openAiService.streamChatCompletion(messages);
  }
}
