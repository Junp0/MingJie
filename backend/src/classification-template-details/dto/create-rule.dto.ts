import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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

  @ApiProperty({ example: 85 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  hitRate!: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
