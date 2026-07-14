import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateRuleDto {
  @ApiProperty()
  @IsString()
  dataTypeId!: string;

  @ApiProperty({ example: 'columnName' })
  @IsString()
  target!: string;

  @ApiProperty({ example: 'contains' })
  @IsString()
  matcher!: string;

  @ApiProperty({ example: 'phone,mobile' })
  @IsString()
  value!: string;

  @ApiPropertyOptional({ example: 100, description: '仅样本数据规则需要配置' })
  @ValidateIf(
    (dto: CreateRuleDto) =>
      dto.target === 'sampleData' || dto.hitRate !== undefined,
  )
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  hitRate?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
