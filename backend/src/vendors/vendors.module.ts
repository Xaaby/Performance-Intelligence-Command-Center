import { Module } from '@nestjs/common';
import { DataLoaderModule } from '../data-loader/data-loader.module';
import { ScoringModule } from '../scoring/scoring.module';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

@Module({
  imports: [DataLoaderModule, ScoringModule],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
