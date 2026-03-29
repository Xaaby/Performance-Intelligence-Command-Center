import { Module } from '@nestjs/common';
import { DataLoaderModule } from '../data-loader/data-loader.module';
import { VendorsModule } from '../vendors/vendors.module';
import { RedirectController } from './redirect.controller';
import { RedirectService } from './redirect.service';

@Module({
  imports: [DataLoaderModule, VendorsModule],
  controllers: [RedirectController],
  providers: [RedirectService],
  exports: [RedirectService],
})
export class RedirectModule {}
