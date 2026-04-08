import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'NewPassword123' })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password!: string;
}
