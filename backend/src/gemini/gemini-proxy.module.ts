import { Module } from '@nestjs/common';
import { GeminiProxyController } from './gemini-proxy.controller';
import { GeminiProxyService } from './gemini-proxy.service';

@Module({
  controllers: [GeminiProxyController],
  providers: [GeminiProxyService],
})
export class GeminiProxyModule {}
