import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type {
  RedirectClickRequest,
  RedirectClickResponse,
  RedirectEvent,
  RedirectStatsResponse,
} from '../scoring/scoring.types';
import { RedirectService } from './redirect.service';

@Controller('redirect')
export class RedirectController {
  constructor(private readonly redirectService: RedirectService) {}

  @Post('click')
  click(@Body() body: RedirectClickRequest): RedirectClickResponse {
    return this.redirectService.recordClick(body);
  }

  @Get('stats')
  stats(): RedirectStatsResponse {
    return this.redirectService.getStats();
  }

  @Get('events')
  events(
    @Query('vendor_id') vendorId?: string,
    @Query('limit') limit?: string,
  ): RedirectEvent[] {
    return this.redirectService.getEvents(vendorId, Number(limit ?? 20));
  }

  @Get('health')
  health(): { status: 'ok'; total_clicks_stored: number } {
    return this.redirectService.getHealth();
  }
}
