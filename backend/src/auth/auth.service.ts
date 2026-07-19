import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async register(data: RegisterDto) {
    const exists = await this.prisma.usuario.findUnique({ where: { email: data.email.toLowerCase() } });
    if (exists) throw new ConflictException('Ya existe una cuenta con este correo.');
    const user = await this.prisma.usuario.create({ data: { fullName: data.fullName.trim(), email: data.email.toLowerCase(), passwordHash: await bcrypt.hash(data.password, 12), role: UserRole.CITIZEN } });
    return this.createSession(user);
  }

  async login(data: LoginDto) {
    const user = await this.prisma.usuario.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!user?.passwordHash || !(await bcrypt.compare(data.password, user.passwordHash))) throw new UnauthorizedException('Correo o contraseña incorrectos.');
    return this.createSession(user);
  }

  private async createSession(user: { id: string; fullName: string; email: string | null; role: UserRole; assignedCenterId: string | null }) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role, centerId: user.assignedCenterId, email: user.email });
    return { accessToken, user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, assignedCenterId: user.assignedCenterId } };
  }
}
