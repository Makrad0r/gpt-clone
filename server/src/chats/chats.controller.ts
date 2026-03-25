import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { ChatsService } from './chats.service';
import type { RequestContext } from '../common/request-context';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';

@Controller('chats')
@UseGuards(OptionalAuthGuard)
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  getChats(@Req() req: RequestContext) {
    if (req.user) {
      return this.chatsService.getChatsForUser(req.user.id);
    }

    if (req.anonymousSession) {
      return this.chatsService.getChatsForAnonymous(req.anonymousSession.id);
    }

    throw new UnauthorizedException('Authentication required');
  }

  @Post()
  createChat(@Req() req: RequestContext, @Body() body: CreateChatDto) {
    if (req.user) {
      return this.chatsService.createUserChat(req.user.id, body.title);
    }

    if (req.anonymousSession) {
      return this.chatsService.createAnonymousChat(
        req.anonymousSession.id,
        body.title,
      );
    }

    throw new UnauthorizedException('Authentication required');
  }

  @Get(':chatId')
  getChat(@Req() req: RequestContext, @Param('chatId') chatId: string) {
    if (req.user) {
      return this.chatsService.getUserChat(chatId, req.user.id);
    }

    if (req.anonymousSession) {
      return this.chatsService.getAnonymousChat(
        chatId,
        req.anonymousSession.id,
      );
    }

    throw new UnauthorizedException('Authentication required');
  }

  @Get(':chatId/messages')
  getMessages(@Req() req: RequestContext, @Param('chatId') chatId: string) {
    if (req.user) {
      return this.chatsService.getUserMessages(chatId, req.user.id);
    }

    if (req.anonymousSession) {
      return this.chatsService.getAnonymousMessages(
        chatId,
        req.anonymousSession.id,
      );
    }

    throw new UnauthorizedException('Authentication required');
  }
}
