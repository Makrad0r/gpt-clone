import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { SupabaseService } from './supabase/supabase.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('/health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('/health/db')
  async getDbHealth() {
    const { error } = await this.supabaseService.admin
      .from('chats')
      .select('id')
      .limit(1);

    return {
      ok: !error,
      error: error?.message ?? null,
    };
  }
}
