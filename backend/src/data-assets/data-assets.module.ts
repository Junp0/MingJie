import { Module } from '@nestjs/common';
import { DataAssetsController } from './data-assets.controller';
import { DataAssetsService } from './data-assets.service';

@Module({
  controllers: [DataAssetsController],
  providers: [DataAssetsService],
  exports: [DataAssetsService],
})
export class DataAssetsModule {}
