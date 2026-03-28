import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('currentUser')
  currentUser() {
    return this.authService.currentUser();
  }

  @Post('login/account')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('login/outLogin')
  logout() {
    return this.authService.logout();
  }

  @Get('login/captcha')
  captcha() {
    return this.authService.getCaptcha();
  }
}
