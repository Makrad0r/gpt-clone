import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';

type AnonymousSessionRow = {
  id: string;
  session_token: string;
  questions_used: number;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class AnonymousService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async createSession() {
    const token = randomUUID();

    const result = await this.supabaseService.admin
      .from('anonymous_sessions')
      .insert({
        session_token: token,
      })
      .select('id, session_token, questions_used, created_at, updated_at')
      .single();

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }

    const session = result.data as AnonymousSessionRow;

    return {
      id: session.id,
      sessionToken: session.session_token,
      questionsUsed: session.questions_used,
    };
  }

  async getSessionByToken(sessionToken: string) {
    const result = await this.supabaseService.admin
      .from('anonymous_sessions')
      .select('id, session_token, questions_used')
      .eq('session_token', sessionToken)
      .maybeSingle();

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }

    const session = (result.data as AnonymousSessionRow | null) ?? null;

    if (!session) {
      throw new UnauthorizedException('Invalid anonymous session');
    }

    return {
      id: session.id,
      sessionToken: session.session_token,
      questionsUsed: session.questions_used,
    };
  }

  async incrementQuestionsUsed(sessionId: string) {
    const currentResult = await this.supabaseService.admin
      .from('anonymous_sessions')
      .select('id, questions_used')
      .eq('id', sessionId)
      .single();

    if (currentResult.error) {
      throw new InternalServerErrorException(currentResult.error.message);
    }

    const current = currentResult.data as {
      id: string;
      questions_used: number;
    };

    const nextValue = current.questions_used + 1;

    const updateResult = await this.supabaseService.admin
      .from('anonymous_sessions')
      .update({
        questions_used: nextValue,
      })
      .eq('id', sessionId)
      .select('id, session_token, questions_used')
      .single();

    if (updateResult.error) {
      throw new InternalServerErrorException(updateResult.error.message);
    }

    const session = updateResult.data as AnonymousSessionRow;

    return {
      id: session.id,
      sessionToken: session.session_token,
      questionsUsed: session.questions_used,
    };
  }
}
