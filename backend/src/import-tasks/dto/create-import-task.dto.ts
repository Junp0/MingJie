import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImportTaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateImportTaskDto {
  @ApiProperty({ example: '用户中心主库' })
  @IsString()
  sourceName!: string;

  @ApiProperty({ example: 'mysql' })
  @IsString()
  sourceType!: string;

  @ApiProperty({ example: '10.0.0.10' })
  @IsString()
  ipAddress!: string;

  @ApiProperty({ example: 3306 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  port!: number;

  @ApiPropertyOptional({ example: 'user_center' })
  @IsOptional()
  @IsString()
  databaseName?: string;

  @ApiPropertyOptional({ example: ['user_center', 'order_db'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  databaseNames?: string[];

  @ApiPropertyOptional({ example: 'importer' })
  @IsOptional()
  @IsString()
  sourceUsername?: string;

  @ApiPropertyOptional({ example: 'importer123' })
  @IsOptional()
  @IsString()
  sourcePassword?: string;

  @ApiProperty()
  @IsString()
  assetGroupId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  creatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classificationTaskId?: string;

  @ApiPropertyOptional({
    enum: ImportTaskStatus,
    default: ImportTaskStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ImportTaskStatus)
  status?: ImportTaskStatus;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  progress?: number;

  @ApiPropertyOptional({ example: '夜间定时导入任务' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'daily', default: 'single' })
  @IsOptional()
  @IsString()
  scheduleMode?: string;

  @ApiPropertyOptional({ example: '2026-03-30 18:00:00' })
  @IsOptional()
  @IsString()
  executeAt?: string | null;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sampleCount?: number;

  @ApiPropertyOptional({ example: 'latest', default: 'latest' })
  @IsOptional()
  @IsString()
  @IsIn(['latest', 'random'])
  sampleStrategy?: string;

  @ApiPropertyOptional({ example: 'replace', default: 'replace' })
  @IsOptional()
  @IsString()
  @IsIn(['replace', 'incremental'])
  sampleStorageMode?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  runImmediately?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  runClassificationImmediatelyAfterImport?: boolean;
}
