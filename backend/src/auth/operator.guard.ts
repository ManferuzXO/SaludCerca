import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from './jwt-auth.guard';

@Injectable()
export class OperatorGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user?.role !== UserRole.OPERATOR && request.user?.role !== UserRole.ADMIN) throw new ForbiddenException('Esta acción requiere una cuenta de operador.');
    return true;
  }
}
