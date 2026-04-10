import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateAssetGroupDto {
  @ApiProperty({ example: '用户数据域' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: '核心用户主数据分组' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
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
  @MaxLength(20)
  owner?: string;

  @ApiPropertyOptional({ example: '数据平台部' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  department?: string;
}
