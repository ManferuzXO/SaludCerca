import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, slotId: string, latitude: number, longitude: number) {
    return this.prisma.$transaction(async (tx) => {
      const activeAppointment = await tx.ficha.findFirst({
        where: { userId, status: 'BOOKED', slot: { startsAt: { gte: new Date() } } },
      });
      if (activeAppointment) {
        throw new ConflictException('Ya tienes una ficha activa. Puedes consultar su código en Mis fichas.');
      }
      const slot = await tx.turnoFicha.findUnique({ where: { id: slotId }, include: { service: true, center: true } });
      if (!slot) throw new NotFoundException('El horario seleccionado no existe.');
      if (slot.center.latitude !== null && slot.center.longitude !== null) {
      const centers = await tx.centroSalud.findMany({
        where: { latitude: { not: null }, longitude: { not: null } },
        select: { id: true, latitude: true, longitude: true },
      });
      const nearestCenter = centers.reduce((nearest, center) => {
        const currentDistance = (Number(center.latitude) - latitude) ** 2 + (Number(center.longitude) - longitude) ** 2;
        const nearestDistance = (Number(nearest.latitude) - latitude) ** 2 + (Number(nearest.longitude) - longitude) ** 2;
        return currentDistance < nearestDistance ? center : nearest;
      });
      if (slot.centerId !== nearestCenter.id) throw new ConflictException('La ficha solo se puede reservar en el centro de salud más cercano a tu ubicación.');
      if (slot.startsAt <= new Date()) throw new ConflictException('Este horario ya no está disponible.');
      }
      if (slot.reserved >= slot.capacity) throw new ConflictException('Este horario ya no tiene fichas disponibles.');

      const appointment = await tx.ficha.create({
        data: { userId, slotId, checkInCode: `SC-${randomUUID().slice(0, 8).toUpperCase()}` },
        include: { slot: { include: { center: true, service: true } } },
      });
      await tx.turnoFicha.update({ where: { id: slotId }, data: { reserved: { increment: 1 } } });
      return this.toPublicAppointment(appointment);
    });
  }

  async findMine(userId: string) {
    const appointments = await this.prisma.ficha.findMany({
      where: { userId }, include: { slot: { include: { center: true, service: true } } }, orderBy: { createdAt: 'desc' },
    });
    return appointments.map((appointment) => this.toPublicAppointment(appointment));
  }

  async cancel(userId: string, appointmentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.ficha.findFirst({
        where: { id: appointmentId, userId },
        include: { slot: true },
      });
      if (!appointment) throw new NotFoundException('No encontramos esta ficha en tu cuenta.');
      if (appointment.status !== 'BOOKED') throw new ConflictException('Esta ficha ya no se puede cancelar.');
      if (appointment.slot.startsAt <= new Date()) throw new ConflictException('No puedes cancelar una ficha que ya inició.');

      const updated = await tx.ficha.update({
        where: { id: appointment.id },
        data: { status: 'CANCELLED' },
        include: { slot: { include: { center: true, service: true } } },
      });
      await tx.turnoFicha.update({ where: { id: appointment.slotId }, data: { reserved: { decrement: 1 } } });
      return this.toPublicAppointment(updated);
    });
  }

  private toPublicAppointment(appointment: { id: string; checkInCode: string; status: string; createdAt: Date; slot: { startsAt: Date; center: { name: string; address: string }; service: { name: string } } }) {
    return { id: appointment.id, code: appointment.checkInCode, status: appointment.status, createdAt: appointment.createdAt, center: appointment.slot.center.name, address: appointment.slot.center.address, service: appointment.slot.service.name, startsAt: appointment.slot.startsAt };
  }
}
