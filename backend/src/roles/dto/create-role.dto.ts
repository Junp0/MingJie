import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CommonStatus } from '@prisma/client';

export class CreateRoleDto {
  @ApiProperty({ example: '数据分析员' })
  @IsString()
  @MaxLength(50)
  name!: string;

  @ApiProperty({ example: 'data_analyst' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiPropertyOptional({ example: '负责数据分析的角色' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiProperty({ example: ['dashboard:view', 'data_overview:view'] })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];

  @ApiPropertyOptional({ enum: CommonStatus })
  @IsOptional()
  @IsEnum(CommonStatus)
  status?: CommonStatus;
}
