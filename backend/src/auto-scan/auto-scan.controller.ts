import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AutoScanService } from './auto-scan.service';
import { CreateAutoScanRuleDto } from './dto/create-auto-scan-rule.dto';
import { UpdateAutoScanRuleDto } from './dto/update-auto-scan-rule.dto';

@ApiTags('auto-scan')
@Controller('auto-scan')
export class AutoScanController {
  constructor(private readonly autoScanService: AutoScanService) {}

  @Get('rules')
  listRules() {
    return this.autoScanService.listRules();
  }

  @Get('results')
  listResults() {
    return this.autoScanService.listResults();
  }

  @Post('rules')
  createRule(@Body() dto: CreateAutoScanRuleDto) {
    return this.autoScanService.createRule(dto);
  }

  @Patch('rules/:id')
  updateRule(@Param('id') id: string, @Body() dto: UpdateAutoScanRuleDto) {
    return this.autoScanService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  removeRule(@Param('id') id: string) {
    return this.autoScanService.removeRule(id);
  }

  @Post('results/:id/claim')
  claimResult(@Param('id') id: string) {
    return this.autoScanService.claimResult(id);
  }
}
