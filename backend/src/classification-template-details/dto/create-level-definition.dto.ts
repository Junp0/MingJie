import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateLevelDefinitionDto {
  @ApiProperty()
  @IsString()
  templateId!: string;

  @ApiProperty({ example: 'L3' })
  @IsString()
  code!: string;

  @ApiProperty({ example: '敏感' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'red' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: '敏感个人数据' })
  @IsOptional()
  @IsString()
  description?: string;

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

  @ApiPropertyOptional({ example: '适用于手机号、身份证等字段' })
  @IsOptional()
  @IsString()
  note?: string;
}
