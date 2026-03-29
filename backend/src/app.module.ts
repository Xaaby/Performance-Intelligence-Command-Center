import { Module } from '@nestjs/common';
import { DataLoaderModule } from './data-loader/data-loader.module';
import { ExperimentsModule } from './experiments/experiments.module';
import { GeminiProxyModule } from './gemini/gemini-proxy.module';
import { HealthModule } from './health/health.module';
import { RedirectModule } from './redirect/redirect.module';
import { ScoringModule } from './scoring/scoring.module';
import { VendorsModule } from './vendors/vendors.module';

@Module({
  imports: [
    DataLoaderModule,
    ScoringModule,
    VendorsModule,
    RedirectModule,
    ExperimentsModule,
    HealthModule,
    GeminiProxyModule,
  ],
})
export class AppModule {}
