import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DataOverviewController } from './data-overview.controller';
import { DataOverviewService } from './data-overview.service';

@Module({
  imports: [PrismaModule],
  controllers: [DataOverviewController],
  providers: [DataOverviewService],
})
export class DataOverviewModule {}
