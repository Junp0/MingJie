import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'ant.design' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ example: 'account', enum: ['account', 'mobile'] })
  @IsString()
  @IsIn(['account', 'mobile'])
  type!: 'account' | 'mobile';

  @ApiProperty({ example: '13800138000', required: false })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiProperty({ example: '123456', required: false })
  @IsOptional()
  @IsString()
  captcha?: string;
}
