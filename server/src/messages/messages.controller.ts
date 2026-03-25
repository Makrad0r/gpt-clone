import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import type { RequestContext } from '../common/request-context';
import { AnonymousService } from '../anonymous/anonymous.service';

@Controller('chats')
@UseGuards(OptionalAuthGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly anonymousService: AnonymousService,
  ) {}

  @Post(':chatId/messages/stream')
  async streamMessage(
    @Req() req: RequestContext,
    @Res() res: Response,
    @Param('chatId') chatId: string,
    @Body() body: SendMessageDto,
  ) {
    const trimmedContent = body.content.trim();

    if (!trimmedContent) {
      res.status(400).json({ message: 'Message content is required' });
      return;
    }

    let chatTitle = 'New chat';

    if (req.user) {
      const chat = await this.messagesService.getOwnedUserChat(
        chatId,
        req.user.id,
      );
      chatTitle = chat.title;
    } else if (req.anonymousSession) {
      if (req.anonymousSession.questionsUsed >= 3) {
        throw new ForbiddenException('Free guest limit reached');
      }

      const chat = await this.messagesService.getOwnedAnonymousChat(
        chatId,
        req.anonymousSession.id,
      );
      chatTitle = chat.title;

      await this.anonymousService.incrementQuestionsUsed(
        req.anonymousSession.id,
      );
    } else {
      throw new UnauthorizedException('Authentication required');
    }

    await this.messagesService.saveUserMessage(
      chatId,
      trimmedContent,
      body.imageUrl,
    );
    await this.messagesService.renameChatIfNeeded(
      chatId,
      chatTitle,
      trimmedContent,
    );

    const history = await this.messagesService.getChatMessages(chatId);
    const openAiMessages = this.messagesService.buildOpenAiMessages(history);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');

    let assistantText = '';

    try {
      for await (const chunk of this.messagesService.streamAssistantReply(
        openAiMessages,
      )) {
        assistantText += chunk;
        res.write(chunk);
      }

      await this.messagesService.saveAssistantMessage(chatId, assistantText);
      await this.messagesService.touchChat(chatId);
      res.end();
    } catch (error: unknown) {
      console.error('Streaming controller error:', error);

      const message =
        error instanceof Error ? error.message : 'Failed to stream response';

      if (!res.headersSent) {
        res.status(500).json({ message });
        return;
      }

      res.end();
    }
  }
}
