import { Module } from '@nestjs/common';
import { DataLoaderModule } from '../data-loader/data-loader.module';
import { HealthController } from './health.controller';

@Module({
  imports: [DataLoaderModule],
  controllers: [HealthController],
})
export class HealthModule {}
