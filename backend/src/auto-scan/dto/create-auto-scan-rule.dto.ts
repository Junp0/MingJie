import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScanTaskStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateAutoScanRuleDto {
  @ApiProperty({ example: '每日 MySQL 资产扫描' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: '0 2 * * *' })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assetGroupId?: string;

  @ApiPropertyOptional({ example: 'mysql' })
  @IsOptional()
  @IsString()
  sourceType?: string;

  @ApiPropertyOptional({ enum: ScanTaskStatus, default: ScanTaskStatus.DRAFT })
  @IsOptional()
  @IsEnum(ScanTaskStatus)
  status?: ScanTaskStatus;

  @ApiPropertyOptional({ example: '每天凌晨扫描新增数据库实例' })
  @IsOptional()
  @IsString()
  description?: string;
}
