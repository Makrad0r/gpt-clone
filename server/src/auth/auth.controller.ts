import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { SupabaseAuthGuard } from './supabase-auth.guard'

type AuthenticatedRequest = Request & {
  user: {
    id: string
    email?: string | null
  }
}

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  getMe(@Req() req: AuthenticatedRequest) {
    return {
      user: req.user,
    }
  }
}