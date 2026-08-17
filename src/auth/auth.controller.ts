import { Body, Controller, Post, HttpCode, HttpStatus, Delete, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body('password') password: string, @Body('token') token: string){
    return this.authService.resetPassword(password, token);
  }

 
  @UseGuards(AuthGuard('jwt'))
  @Delete('account')
  async deleteAccount(@Request() req) {
    // The JWT Guard automatically extracts the user's ID from the token into req.user.sub
    return this.authService.deleteAccount(req.user.sub);
  }
}
