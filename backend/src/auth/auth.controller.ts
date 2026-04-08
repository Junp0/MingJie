import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('currentUser')
  currentUser(@Request() req: { user?: { userId: string } }) {
    return this.authService.currentUser(req.user!.userId);
  }

  @Public()
  @Post('login/account')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Public()
  @Post('login/outLogin')
  logout() {
    return this.authService.logout();
  }

  @Public()
  @Get('login/captcha')
  captcha() {
    return this.authService.getCaptcha();
  }
}
