import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from './jwt-auth.guard';

@Injectable()
export class AssignedCenterGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user?.role === UserRole.ADMIN) return true;
    if (request.user?.centerId === request.params.id) return true;
    throw new ForbiddenException('Sólo puedes actualizar el centro de salud que tienes asignado.');
  }
}
