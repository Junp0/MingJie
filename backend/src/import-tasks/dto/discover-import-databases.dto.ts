import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class DiscoverImportDatabasesDto {
  @ApiProperty({ example: 'mysql' })
  @IsString()
  sourceType!: string;

  @ApiProperty({ example: '127.0.0.1' })
  @IsString()
  ipAddress!: string;

  @ApiProperty({ example: 3308 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  port!: number;

  @ApiProperty({ example: 'importer' })
  @IsString()
  sourceUsername!: string;

  @ApiProperty({ example: 'importer123', required: false })
  @IsOptional()
  @IsString()
  sourcePassword?: string;

  @ApiProperty({ example: 'mysql', required: false })
  @IsOptional()
  @IsString()
  databaseType?: string;

  @ApiProperty({ example: 'cm123', required: false })
  @IsOptional()
  @IsString()
  taskId?: string;
}
