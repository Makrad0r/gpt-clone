import { Module } from '@nestjs/common';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { AnonymousService } from './anonymous.service';
import { AnonymousController } from './anonymous.controller';

@Module({
  controllers: [AnonymousController],
  providers: [AnonymousService, OptionalAuthGuard],
  exports: [AnonymousService],
})
export class AnonymousModule {}
