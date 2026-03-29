import { Controller, Get } from '@nestjs/common';
import { DataLoaderService } from '../data-loader/data-loader.service';

@Controller('health')
export class HealthController {
  constructor(private readonly dataLoader: DataLoaderService) {}

  @Get()
  health() {
    const vendors = this.dataLoader.getVendors();
    return {
      status: 'ok' as const,
      data_loaded: this.dataLoader.isLoaded(),
      vendor_count: vendors.length,
    };
  }
}
