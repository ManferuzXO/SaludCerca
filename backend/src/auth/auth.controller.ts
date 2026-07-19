import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() data: RegisterDto) { return this.auth.register(data); }

  @Post('login')
  login(@Body() data: LoginDto) { return this.auth.login(data); }
}
