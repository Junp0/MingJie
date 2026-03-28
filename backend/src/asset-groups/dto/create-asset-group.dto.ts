import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommonStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateAssetGroupDto {
  @ApiProperty({ example: '用户数据域' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: '核心用户主数据分组' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  level?: number;

  @ApiPropertyOptional({ example: '张三' })
  @IsOptional()
  @IsString()
  owner?: string;

  @ApiPropertyOptional({ example: '数据平台部' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ enum: CommonStatus, default: CommonStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CommonStatus)
  status?: CommonStatus;
}
