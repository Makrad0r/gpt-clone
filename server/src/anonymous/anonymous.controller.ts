import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { RequestContext } from '../common/request-context';
import { AnonymousService } from './anonymous.service';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';

@Controller('anonymous')
export class AnonymousController {
  constructor(private readonly anonymousService: AnonymousService) {}

  @Post('session')
  createSession() {
    return this.anonymousService.createSession();
  }

  @Get('me')
  @UseGuards(OptionalAuthGuard)
  async getSession(@Req() req: RequestContext) {
    if (!req.anonymousSession) {
      return {
        anonymousSession: null,
      };
    }

    const session = await this.anonymousService.getSessionByToken(
      req.anonymousSession.sessionToken,
    );

    return {
      anonymousSession: session,
    };
  }
}
