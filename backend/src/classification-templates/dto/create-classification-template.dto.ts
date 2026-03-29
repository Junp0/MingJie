import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TemplateStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateClassificationTemplateDto {
  @ApiProperty({ example: '标准分类分级模板' })
  @IsString()
  templateName!: string;

  @ApiPropertyOptional({ enum: TemplateStatus, default: TemplateStatus.DRAFT })
  @IsOptional()
  @IsEnum(TemplateStatus)
  status?: TemplateStatus;

  @ApiPropertyOptional({ example: 'custom' })
  @IsOptional()
  @IsString()
  templateType?: string;

  @ApiPropertyOptional({ example: '用于业务数据分级管理' })
  @IsOptional()
  @IsString()
  description?: string;
}
