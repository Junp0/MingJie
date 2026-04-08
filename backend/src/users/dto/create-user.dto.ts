import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'zhangsan' })
  @IsString()
  @MaxLength(50)
  username!: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password!: string;

  @ApiProperty({ example: '张三' })
  @IsString()
  @MaxLength(50)
  name!: string;

  @ApiPropertyOptional({ example: 'zhangsan@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '13800138001' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'cuid_role_id' })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional({ example: '数据分析师' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  title?: string;

  @ApiPropertyOptional({ example: '数据治理中心' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;
}
