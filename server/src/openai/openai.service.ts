import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import OpenAI from 'openai'

@Injectable()
export class OpenAiService {
  private readonly client: OpenAI
  private readonly model: string

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')
    const model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini'

    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY')
    }

    this.client = new OpenAI({ apiKey })
    this.model = model
  }

  async *streamChatCompletion(
    messages: Array<{
      role: 'system' | 'user' | 'assistant'
      content: string
    }>,
  ): AsyncGenerator<string> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        stream: true,
        messages,
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content

        if (content) {
          yield content
        }
      }
    } catch (error: unknown) {
      console.error('OpenAI error:', error)

      let message = 'OpenAI request failed'

      if (error instanceof Error) {
        message = error.message
      }

      throw new InternalServerErrorException(message)
    }
  }
}