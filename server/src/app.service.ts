import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      ok: true,
      service: 'chatbot-api',
      timestamp: new Date().toISOString(),
    };
  }
}
