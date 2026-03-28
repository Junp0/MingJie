import { Module } from '@nestjs/common';
import { AutoScanController } from './auto-scan.controller';
import { AutoScanService } from './auto-scan.service';

@Module({
  controllers: [AutoScanController],
  providers: [AutoScanService],
  exports: [AutoScanService],
})
export class AutoScanModule {}
