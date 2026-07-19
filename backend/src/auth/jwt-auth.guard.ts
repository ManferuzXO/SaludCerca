import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export type AuthenticatedRequest = Request & { user?: { sub: string; role: string; centerId?: string } };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Debes iniciar sesión para realizar esta acción.');
    try { request.user = await this.jwt.verifyAsync(token); return true; }
    catch { throw new UnauthorizedException('Tu sesión no es válida o expiró.'); }
  }
}
