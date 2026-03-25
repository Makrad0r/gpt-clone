import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';
import { RequestContext } from '../common/request-context';

type AnonymousSessionRow = {
  id: string;
  session_token: string;
  questions_used: number;
};

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestContext>();
    const authHeader = request.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();

      if (token) {
        const rawResponse: unknown =
          await this.supabaseService.admin.auth.getUser(token);

        if (
          typeof rawResponse === 'object' &&
          rawResponse !== null &&
          'data' in rawResponse
        ) {
          const response = rawResponse as {
            data?: {
              user?: {
                id: string;
                email?: string | null;
              } | null;
            };
          };

          const user = response.data?.user ?? null;

          if (user) {
            request.user = {
              id: user.id,
              email: user.email,
            };

            return true;
          }
        }
      }
    }

    const anonymousSessionToken = request.headers[
      'x-anonymous-session-token'
    ] as string | undefined;

    if (anonymousSessionToken) {
      const result = await this.supabaseService.admin
        .from('anonymous_sessions')
        .select('id, session_token, questions_used')
        .eq('session_token', anonymousSessionToken)
        .maybeSingle();

      const session = (result.data as AnonymousSessionRow | null) ?? null;

      if (session) {
        request.anonymousSession = {
          id: session.id,
          sessionToken: session.session_token,
          questionsUsed: session.questions_used,
        };
      }
    }

    return true;
  }
}
