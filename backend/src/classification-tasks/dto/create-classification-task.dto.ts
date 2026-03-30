import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ClassificationTaskSource,
  ClassificationTaskStatus,
} from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateClassificationTaskDto {
  @ApiProperty({ example: '用户中心敏感数据分类任务' })
  @IsString()
  taskName!: string;

  @ApiPropertyOptional({ example: '用户中心主库' })
  @IsOptional()
  @IsString()
  dataSource?: string | null;

  @ApiPropertyOptional({
    type: [String],
    example: ['cm9m4b7q60000l9084x71demo'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dataAssetIds?: string[] | null;

  @ApiProperty({ example: 'database' })
  @IsString()
  dataType!: string;

  @ApiPropertyOptional({ example: 'automatic' })
  @IsOptional()
  @IsString()
  classificationType?: string;

  @ApiPropertyOptional({ example: 'high' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ example: '首次全量扫描分类' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: ClassificationTaskSource,
    default: ClassificationTaskSource.CLASSIFICATION_CENTER,
  })
  @IsOptional()
  @IsEnum(ClassificationTaskSource)
  source?: ClassificationTaskSource;

  @ApiPropertyOptional({ example: '任务中心' })
  @IsOptional()
  @IsString()
  sourceLabel?: string;

  @ApiPropertyOptional({
    enum: ClassificationTaskStatus,
    default: ClassificationTaskStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ClassificationTaskStatus)
  status?: ClassificationTaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  creatorId?: string;

  @ApiPropertyOptional({ example: '2026-03-30 18:00:00' })
  @IsOptional()
  @IsString()
  executeAt?: string | null;
}
