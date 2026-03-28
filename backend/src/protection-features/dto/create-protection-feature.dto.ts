import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProtectionFeatureStatus, ProtectionFeatureType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateProtectionFeatureDto {
  @ApiProperty({ enum: ProtectionFeatureType })
  @IsEnum(ProtectionFeatureType)
  featureType!: ProtectionFeatureType;

  @ApiProperty({ example: '手机号脱敏识别' })
  @IsString()
  featureName!: string;

  @ApiPropertyOptional({ example: 'MASK_PHONE' })
  @IsOptional()
  @IsString()
  featureCode?: string;

  @ApiPropertyOptional({ example: '通用密文字段' })
  @IsOptional()
  @IsString()
  scene?: string;

  @ApiProperty({ example: '中间4位替换为*' })
  @IsString()
  featurePoint!: string;

  @ApiProperty({ example: 'regex' })
  @IsString()
  matcher!: string;

  @ApiProperty({ example: 90 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  confidence!: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiProperty({ example: '^1\\d{2}\\*{4}\\d{4}$' })
  @IsString()
  expression!: string;

  @ApiProperty({ example: '138****1234' })
  @IsString()
  sampleValue!: string;

  @ApiPropertyOptional({ enum: ProtectionFeatureStatus, default: ProtectionFeatureStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProtectionFeatureStatus)
  status?: ProtectionFeatureStatus;

  @ApiPropertyOptional({ example: '适用于手机号脱敏字段识别' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  creatorId?: string;
}
