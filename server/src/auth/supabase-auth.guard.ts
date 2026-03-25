import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Request } from 'express'
import { SupabaseService } from '../supabase/supabase.service'

type AuthenticatedUser = {
  id: string
  email?: string | null
}

type RequestWithUser = Request & {
  user?: AuthenticatedUser
}

type GetUserSuccess = {
  data: {
    user: {
      id: string
      email?: string | null
    } | null
  }
  error: {
    message: string
  } | null
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>()
    const authHeader = request.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token')
    }

    const token = authHeader.replace('Bearer ', '').trim()

    if (!token) {
      throw new UnauthorizedException('Missing access token')
    }

    const rawResponse = await this.supabaseService.admin.auth.getUser(token)
    const response = rawResponse as GetUserSuccess

    if (response.error || !response.data.user) {
      throw new UnauthorizedException('Invalid access token')
    }

    request.user = {
      id: response.data.user.id,
      email: response.data.user.email,
    }

    return true
  }
}