import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { PatientAccessDto } from './dto/patient-access.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createForPatient(data: CreateAppointmentDto) {
    return this.prisma.$transaction(async (tx) => {
      const patient = await this.getOrCreatePatient(tx, data);
      const active = await tx.ficha.findFirst({
        where: { patientId: patient.id, status: 'BOOKED', slot: { startsAt: { gte: new Date() } } },
      });
      if (active) throw new ConflictException('Ya tienes una ficha activa. Consúltala con tu C.I. en Mis fichas.');

      const slot = await tx.turnoFicha.findUnique({ where: { id: data.slotId }, include: { service: true, center: true } });
      if (!slot) throw new NotFoundException('El horario seleccionado no existe.');
      if (slot.startsAt <= new Date()) throw new ConflictException('Este horario ya no está disponible.');
      if (slot.reserved >= slot.capacity) throw new ConflictException('Este horario ya no tiene fichas disponibles.');

      if (slot.center.latitude !== null && slot.center.longitude !== null) {
        const centers = await tx.centroSalud.findMany({
          where: { latitude: { not: null }, longitude: { not: null } },
          select: { id: true, latitude: true, longitude: true },
        });
        const nearest = centers.reduce((current, center) => {
          const distance = (Number(center.latitude) - data.latitude) ** 2 + (Number(center.longitude) - data.longitude) ** 2;
          const currentDistance = (Number(current.latitude) - data.latitude) ** 2 + (Number(current.longitude) - data.longitude) ** 2;
          return distance < currentDistance ? center : current;
        });
        if (slot.centerId !== nearest.id) {
          throw new ConflictException('La ficha solo se puede reservar en el centro de salud más cercano a tu ubicación.');
        }
      }

      const appointment = await tx.ficha.create({
        data: { patientId: patient.id, slotId: data.slotId, checkInCode: await this.createTicketNumber(tx) },
        include: { slot: { include: { center: true, service: true } } },
      });
      await tx.turnoFicha.update({ where: { id: slot.id }, data: { reserved: { increment: 1 } } });
      return this.toPublicAppointment(appointment);
    });
  }

  async findByPatient(data: PatientAccessDto) {
    const patient = await this.getPatient(data);
    const appointments = await this.prisma.ficha.findMany({
      where: { patientId: patient.id },
      include: { slot: { include: { center: true, service: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return appointments.map((appointment) => this.toPublicAppointment(appointment));
  }

  async cancelByPatient(appointmentId: string, data: PatientAccessDto) {
    const patient = await this.getPatient(data);
    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.ficha.findFirst({ where: { id: appointmentId, patientId: patient.id }, include: { slot: true } });
      if (!appointment) throw new NotFoundException('No encontramos esta ficha para tu C.I.');
      if (appointment.status !== 'BOOKED') throw new ConflictException('Esta ficha ya no se puede cancelar.');
      if (appointment.slot.startsAt <= new Date()) throw new ConflictException('No puedes cancelar una ficha que ya inició.');
      const updated = await tx.ficha.update({
        where: { id: appointment.id }, data: { status: 'CANCELLED' }, include: { slot: { include: { center: true, service: true } } },
      });
      await tx.turnoFicha.update({ where: { id: appointment.slotId }, data: { reserved: { decrement: 1 } } });
      return this.toPublicAppointment(updated);
    });
  }

  // Endpoints heredados: se conservan para las cuentas de demostración ya creadas.
  async findMine(userId: string) {
    const appointments = await this.prisma.ficha.findMany({
      where: { userId }, include: { slot: { include: { center: true, service: true } } }, orderBy: { createdAt: 'desc' },
    });
    return appointments.map((appointment) => this.toPublicAppointment(appointment));
  }

  async cancel(userId: string, appointmentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.ficha.findFirst({ where: { id: appointmentId, userId }, include: { slot: true } });
      if (!appointment) throw new NotFoundException('No encontramos esta ficha en tu cuenta.');
      if (appointment.status !== 'BOOKED') throw new ConflictException('Esta ficha ya no se puede cancelar.');
      if (appointment.slot.startsAt <= new Date()) throw new ConflictException('No puedes cancelar una ficha que ya inició.');
      const updated = await tx.ficha.update({
        where: { id: appointment.id }, data: { status: 'CANCELLED' }, include: { slot: { include: { center: true, service: true } } },
      });
      await tx.turnoFicha.update({ where: { id: appointment.slotId }, data: { reserved: { decrement: 1 } } });
      return this.toPublicAppointment(updated);
    });
  }

  private normalizeCi(ci: string) {
    return ci.trim().toUpperCase().replace(/\s+/g, '').replace(/-/g, '');
  }

  private hashCi(ci: string) {
    return createHash('sha256').update(this.normalizeCi(ci)).digest('hex');
  }

  private async getOrCreatePatient(tx: Prisma.TransactionClient, data: CreateAppointmentDto) {
    const ciHash = this.hashCi(data.ci);
    const existing = await tx.paciente.findUnique({ where: { ciHash } });
    if (existing) {
      return tx.paciente.update({
        where: { id: existing.id }, data: { fullName: data.fullName.trim(), insuranceProvider: data.insuranceProvider },
      });
    }
    return tx.paciente.create({
      data: {
        ciHash,
        ciLast4: this.normalizeCi(data.ci).slice(-4),
        fullName: data.fullName.trim(),
        insuranceProvider: data.insuranceProvider,
      },
    });
  }

  private async getPatient(data: PatientAccessDto) {
    const patient = await this.prisma.paciente.findUnique({ where: { ciHash: this.hashCi(data.ci) } });
    if (!patient) throw new UnauthorizedException('No encontramos fichas asociadas a ese C.I.');
    return patient;
  }

  private async createTicketNumber(tx: Prisma.TransactionClient) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const ticket = `SC-${randomInt(100000, 1000000)}`;
      const exists = await tx.ficha.findUnique({ where: { checkInCode: ticket }, select: { id: true } });
      if (!exists) return ticket;
    }
    throw new ConflictException('No se pudo generar un número de ficha. Intenta nuevamente.');
  }

  private toPublicAppointment(appointment: { id: string; checkInCode: string; status: string; createdAt: Date; slot: { startsAt: Date; center: { name: string; address: string }; service: { name: string } } }) {
    return { id: appointment.id, code: appointment.checkInCode, status: appointment.status, createdAt: appointment.createdAt, center: appointment.slot.center.name, address: appointment.slot.center.address, service: appointment.slot.service.name, startsAt: appointment.slot.startsAt };
  }
}
