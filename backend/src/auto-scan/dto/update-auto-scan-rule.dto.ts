import { PartialType } from '@nestjs/swagger';
import { CreateAutoScanRuleDto } from './create-auto-scan-rule.dto';

export class UpdateAutoScanRuleDto extends PartialType(CreateAutoScanRuleDto) {}
