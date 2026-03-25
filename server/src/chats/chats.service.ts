import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type ChatRow = {
  id: string;
  user_id: string | null;
  anonymous_session_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class ChatsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getChatsForUser(userId: string) {
    const result = await this.supabaseService.admin
      .from('chats')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }

    return result.data ?? [];
  }

  async getChatsForAnonymous(anonymousSessionId: string) {
    const result = await this.supabaseService.admin
      .from('chats')
      .select('id, title, created_at, updated_at')
      .eq('anonymous_session_id', anonymousSessionId)
      .order('updated_at', { ascending: false });

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }

    return result.data ?? [];
  }

  async createUserChat(userId: string, title?: string) {
    const result = await this.supabaseService.admin
      .from('chats')
      .insert({
        user_id: userId,
        title: title?.trim() || 'New chat',
      })
      .select('id, title, created_at, updated_at')
      .single();

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }

    return result.data;
  }

  async createAnonymousChat(anonymousSessionId: string, title?: string) {
    const result = await this.supabaseService.admin
      .from('chats')
      .insert({
        anonymous_session_id: anonymousSessionId,
        title: title?.trim() || 'New chat',
      })
      .select('id, title, created_at, updated_at')
      .single();

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }

    return result.data;
  }

  async getUserMessages(chatId: string, userId: string) {
    await this.getOwnedUserChat(chatId, userId);

    const result = await this.supabaseService.admin
      .from('messages')
      .select('id, chat_id, role, content, image_url, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }

    return result.data ?? [];
  }

  async getAnonymousMessages(chatId: string, anonymousSessionId: string) {
    await this.getOwnedAnonymousChat(chatId, anonymousSessionId);

    const result = await this.supabaseService.admin
      .from('messages')
      .select('id, chat_id, role, content, image_url, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }

    return result.data ?? [];
  }

  async getUserChat(chatId: string, userId: string) {
    const chat = await this.getOwnedUserChat(chatId, userId);

    return {
      id: chat.id,
      title: chat.title,
      created_at: chat.created_at,
      updated_at: chat.updated_at,
    };
  }

  async getAnonymousChat(chatId: string, anonymousSessionId: string) {
    const chat = await this.getOwnedAnonymousChat(chatId, anonymousSessionId);

    return {
      id: chat.id,
      title: chat.title,
      created_at: chat.created_at,
      updated_at: chat.updated_at,
    };
  }

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
}
