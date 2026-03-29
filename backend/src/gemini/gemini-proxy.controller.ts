import { Body, Controller, Post } from '@nestjs/common';
import type { GeminiGenerateBody } from './gemini-proxy.service';
import { GeminiProxyService } from './gemini-proxy.service';

@Controller('gemini')
export class GeminiProxyController {
  constructor(private readonly gemini: GeminiProxyService) {}

  @Post('generateContent')
  generateContent(@Body() body: GeminiGenerateBody) {
    return this.gemini.generate(body);
  }
}
