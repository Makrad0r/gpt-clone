import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { OpenAiModule } from '../openai/openai.module';
import { AnonymousModule } from 'src/anonymous/anonymous.module';

@Module({
  imports: [OpenAiModule, AnonymousModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
