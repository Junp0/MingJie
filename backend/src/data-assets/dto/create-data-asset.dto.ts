import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommonStatus, DataLevel } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateDataAssetDto {
  @ApiProperty({ example: '用户中心 MySQL 主库' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'mysql' })
  @IsString()
  sourceType!: string;

  @ApiProperty({ example: '10.0.0.12' })
  @IsString()
  ipAddress!: string;

  @ApiProperty({ example: 3306 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  port!: number;

  @ApiProperty({ enum: CommonStatus, default: CommonStatus.ACTIVE })
  @IsEnum(CommonStatus)
  status!: CommonStatus;

  @ApiProperty({ enum: DataLevel, default: DataLevel.INTERNAL })
  @IsEnum(DataLevel)
  dataLevel!: DataLevel;

  @ApiProperty({ example: '张三' })
  @IsString()
  owner!: string;

  @ApiProperty({ example: '数据平台部' })
  @IsString()
  department!: string;

  @ApiPropertyOptional({ type: [String], example: ['mysql', '核心库'] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ example: '承载用户基础信息的核心数据库' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tableCount?: number;

  @ApiPropertyOptional({ example: 96 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fieldCount?: number;

  @ApiPropertyOptional({ example: 52428800 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @ApiPropertyOptional({ example: 250000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  recordCount?: number;

  @ApiProperty()
  @IsString()
  assetGroupId!: string;
}
