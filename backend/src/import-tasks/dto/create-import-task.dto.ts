import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImportTaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

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

  @ApiProperty()
  @IsString()
  assetGroupId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  creatorId?: string;

  @ApiPropertyOptional({ enum: ImportTaskStatus, default: ImportTaskStatus.PENDING })
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
}
