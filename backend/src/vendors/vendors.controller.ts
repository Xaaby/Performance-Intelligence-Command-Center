import { Body, Controller, Get, Post } from '@nestjs/common';
import type { ScoreRequest } from '../scoring/scoring.types';
import { VendorsService } from './vendors.service';

@Controller()
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get('vendors')
  getVendors() {
    return this.vendorsService.getVendorsResponse();
  }

  @Get('vendors/live-updates')
  getLiveUpdates() {
    return this.vendorsService.getRecentLiveUpdates();
  }

  @Post('score')
  score(@Body() body: ScoreRequest) {
    return this.vendorsService.scoreFromInput(body);
  }
}
