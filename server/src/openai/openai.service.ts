import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

type VisionMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  imageUrl?: string | null;
};

@Injectable()
export class OpenAiService {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const model =
      this.configService.get<string>('OPENAI_MODEL') || 'gpt-5.4-nano';

    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY');
    }

    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async *streamChatCompletion(
    messages: VisionMessage[],
  ): AsyncGenerator<string> {
    try {
      const input: OpenAI.Responses.ResponseInput = messages.map((message) => {
        if (message.role === 'user') {
          const content: Array<
            | { type: 'input_text'; text: string }
            | {
                type: 'input_image';
                image_url: string;
                detail: 'auto' | 'low' | 'high';
              }
          > = [];

          if (message.content.trim()) {
            content.push({
              type: 'input_text',
              text: message.content,
            });
          }

          if (message.imageUrl) {
            content.push({
              type: 'input_image',
              image_url: message.imageUrl,
              detail: 'auto',
            });
          }

          return {
            role: 'user',
            content,
          };
        }

        return {
          role: message.role,
          content: message.content,
        };
      }) as OpenAI.Responses.ResponseInput;

      const stream = await this.client.responses.create({
        model: this.model,
        stream: true,
        input,
      });

      for await (const event of stream) {
        if (event.type === 'response.output_text.delta') {
          yield event.delta;
        }
      }
    } catch (error: unknown) {
      console.error('OpenAI error:', error);

      const message =
        error instanceof Error ? error.message : 'OpenAI request failed';

      throw new InternalServerErrorException(message);
    }
  }
}
