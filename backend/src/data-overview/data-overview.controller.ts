import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataOverviewService } from './data-overview.service';

@ApiTags('data-overview')
@Controller('data-overview')
export class DataOverviewController {
  constructor(private readonly dataOverviewService: DataOverviewService) {}

  @Get('full-data-list')
  listFullData(@Query('templateId') templateId?: string) {
    return this.dataOverviewService.listFullData(templateId);
  }

  @Get('missed-data-list')
  listMissedData(@Query('templateId') templateId?: string) {
    return this.dataOverviewService.listMissedData(templateId);
  }

  @Get('table-data-list')
  listTableData(@Query('templateId') templateId?: string) {
    return this.dataOverviewService.listTableData(templateId);
  }
}
