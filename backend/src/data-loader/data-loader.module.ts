import { Module } from '@nestjs/common';
import { DataLoaderService } from './data-loader.service';

@Module({
  providers: [DataLoaderService],
  exports: [DataLoaderService],
})
export class DataLoaderModule {}
