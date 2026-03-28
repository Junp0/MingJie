import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClassificationTaskSource, ClassificationTaskStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateClassificationTaskDto {
  @ApiProperty({ example: '用户中心敏感数据分类任务' })
  @IsString()
  taskName!: string;

  @ApiProperty({ example: '用户中心主库' })
  @IsString()
  dataSource!: string;

  @ApiProperty({ example: 'database' })
  @IsString()
  dataType!: string;

  @ApiProperty({ example: 'automatic' })
  @IsString()
  classificationType!: string;

  @ApiProperty({ example: 'high' })
  @IsString()
  priority!: string;

  @ApiPropertyOptional({ example: '首次全量扫描分类' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ClassificationTaskSource, default: ClassificationTaskSource.CLASSIFICATION_CENTER })
  @IsOptional()
  @IsEnum(ClassificationTaskSource)
  source?: ClassificationTaskSource;

  @ApiPropertyOptional({ example: '任务中心' })
  @IsOptional()
  @IsString()
  sourceLabel?: string;

  @ApiPropertyOptional({ enum: ClassificationTaskStatus, default: ClassificationTaskStatus.PENDING })
  @IsOptional()
  @IsEnum(ClassificationTaskStatus)
  status?: ClassificationTaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  creatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  importTaskId?: string;
}
