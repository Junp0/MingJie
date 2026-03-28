import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateDataTypeDto {
  @ApiProperty()
  @IsString()
  templateId!: string;

  @ApiProperty()
  @IsString()
  categoryId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  levelDefinitionId?: string;

  @ApiProperty({ example: '手机号' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  needMask?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  needEncrypt?: boolean;
}
