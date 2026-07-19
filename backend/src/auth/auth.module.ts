import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OperatorGuard } from './operator.guard';
import { AssignedCenterGuard } from './assigned-center.guard';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: '8h' } })],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, OperatorGuard, AssignedCenterGuard],
  exports: [JwtModule, JwtAuthGuard, OperatorGuard, AssignedCenterGuard],
})
export class AuthModule {}
