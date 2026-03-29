import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataOverviewService } from './data-overview.service';

@ApiTags('data-overview')
@Controller('data-overview')
export class DataOverviewController {
  constructor(private readonly dataOverviewService: DataOverviewService) {}

  @Get('full-data-list')
  listFullData() {
    return this.dataOverviewService.listFullData();
  }

  @Get('missed-data-list')
  listMissedData() {
    return this.dataOverviewService.listMissedData();
  }

  @Get('table-data-list')
  listTableData() {
    return this.dataOverviewService.listTableData();
  }
}
