import { Injectable } from '@nestjs/common';
import { StockStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { FindCentersQuery } from './dto/find-centers.query';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

const stockLabel: Record<StockStatus, 'Disponible' | 'Stock bajo' | 'Sin stock'> = {
  AVAILABLE: 'Disponible', LOW: 'Stock bajo', OUT_OF_STOCK: 'Sin stock',
};

@Injectable()
export class CentersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FindCentersQuery) {
    const text = query.query?.trim();
    const centers = await this.prisma.centroSalud.findMany({
      where: {
        ...(query.openNow === undefined ? {} : { isOpen: query.openNow }),
        ...(text ? { OR: [
          { name: { contains: text, mode: 'insensitive' } },
          { address: { contains: text, mode: 'insensitive' } },
          { services: { some: { name: { contains: text, mode: 'insensitive' } } } },
        ] } : {}),
        ...(query.service ? { services: { some: { name: { equals: query.service, mode: 'insensitive' } } } } : {}),
      },
      include: { services: true, medicines: { orderBy: { updatedAt: 'desc' }, take: 1 } },
      orderBy: { name: 'asc' },
    });
    if (query.service) return centers.map((center) => this.toPublicCenter(center));
    const catalog = await this.prisma.catalogoCentroMunicipal.findMany({
      where: text ? { OR: [
        { name: { contains: text, mode: 'insensitive' } },
        { macrodistrict: { contains: text, mode: 'insensitive' } },
        { address: { contains: text, mode: 'insensitive' } },
      ] } : {},
      orderBy: [{ macrodistrict: 'asc' }, { name: 'asc' }],
    });
    const operationalNames = new Set(centers.map((center) => center.name));
    return [...centers.map((center) => this.toPublicCenter(center)), ...catalog.filter((entry) => !operationalNames.has(entry.name)).map((entry) => this.toPublicCatalog(entry))];
  }

  async findOne(id: string) {
    const center = await this.prisma.centroSalud.findUnique({
      where: { id }, include: { services: true, medicines: { orderBy: { updatedAt: 'desc' }, take: 1 } },
    });
    return center ? this.toPublicCenter(center) : undefined;
  }

  async availability(id: string) {
    const center = await this.prisma.centroSalud.findUnique({ where: { id } });
    if (!center) return undefined;
    const fromNow = new Date();
    const slots = await this.prisma.turnoFicha.findMany({ where: { centerId: id, startsAt: { gte: fromNow } } });
    const medicine = await this.prisma.stockMedicamento.findFirst({ where: { centerId: id }, orderBy: { updatedAt: 'desc' } });
    return {
      centerId: id,
      updatedAt: center.updatedAt.toISOString(),
      appointments: { available: slots.reduce((sum, slot) => sum + Math.max(0, slot.capacity - slot.reserved), 0), estimatedWait: `${center.estimatedWaitMinutes} min` },
      medicines: { status: medicine ? stockLabel[medicine.status] : 'Sin stock', updatedAt: medicine?.updatedAt.toISOString() ?? center.updatedAt.toISOString() },
    };
  }

  async slots(id: string) {
    const center = await this.prisma.centroSalud.findUnique({ where: { id } });
    if (!center) return undefined;
    const slots = await this.prisma.turnoFicha.findMany({
      where: { centerId: id, startsAt: { gte: new Date() } },
      include: { service: true },
      orderBy: { startsAt: 'asc' },
    });
    return slots.map((slot) => ({ id: slot.id, service: slot.service.name, startsAt: slot.startsAt, available: Math.max(0, slot.capacity - slot.reserved), capacity: slot.capacity }));
  }

  async updateAvailability(id: string, update: UpdateAvailabilityDto) {
    const center = await this.prisma.centroSalud.findUnique({ where: { id } });
    if (!center) return undefined;
    const now = new Date();
    const changes: Array<{ field: string; previous: string; current: string }> = [];

    await this.prisma.$transaction(async (tx) => {
      if (update.wait !== undefined) {
        const minutes = Number.parseInt(update.wait, 10);
        if (!Number.isNaN(minutes)) {
          changes.push({ field: 'estimatedWaitMinutes', previous: String(center.estimatedWaitMinutes), current: String(minutes) });
          await tx.centroSalud.update({ where: { id }, data: { estimatedWaitMinutes: minutes } });
        }
      }
      if (update.capacity !== undefined) {
        const service = await tx.servicioSalud.findFirst({ where: { centerId: id, isActive: true }, orderBy: { name: 'asc' } });
        if (service) {
          const currentSlot = await tx.turnoFicha.findFirst({ where: { centerId: id, serviceId: service.id, startsAt: { gte: now } }, orderBy: { startsAt: 'asc' } });
          const previous = currentSlot ? String(Math.max(0, currentSlot.capacity - currentSlot.reserved)) : '0';
          changes.push({ field: 'availableAppointments', previous, current: String(update.capacity) });
          if (currentSlot) await tx.turnoFicha.update({ where: { id: currentSlot.id }, data: { capacity: currentSlot.reserved + update.capacity } });
          else await tx.turnoFicha.create({ data: { centerId: id, serviceId: service.id, startsAt: new Date(now.getTime() + 60 * 60 * 1000), capacity: update.capacity } });
        }
      }
      if (update.stock !== undefined) {
        const status = update.stock === 'Disponible' ? StockStatus.AVAILABLE : update.stock === 'Stock bajo' ? StockStatus.LOW : StockStatus.OUT_OF_STOCK;
        const medicine = await tx.stockMedicamento.findFirst({ where: { centerId: id }, orderBy: { updatedAt: 'desc' } });
        changes.push({ field: 'medicineStatus', previous: medicine ? stockLabel[medicine.status] : 'Sin stock', current: update.stock });
        if (medicine) await tx.stockMedicamento.update({ where: { id: medicine.id }, data: { status } });
        else await tx.stockMedicamento.create({ data: { centerId: id, medicineName: 'Medicamentos principales', status } });
      }
      if (changes.length) await tx.auditoriaDisponibilidad.createMany({ data: changes.map((change) => ({ centerId: id, ...change })) });
    });
    return { ...(await this.availability(id)), updatedBy: 'operador-demo', message: 'Disponibilidad actualizada correctamente' };
  }

  private toPublicCenter(center: { id: string; name: string; kind: string; network: string | null; macrodistrict: string | null; level: number; address: string; latitude: unknown; longitude: unknown; phone: string | null; hours: string | null; isOpen: boolean; estimatedWaitMinutes: number; services: { name: string }[]; medicines: { status: StockStatus }[] }) {
    return {
      id: center.id, name: center.name, kind: center.kind, network: center.network, macrodistrict: center.macrodistrict, level: center.level,
      address: center.address,
      coordinates: center.latitude !== null && center.longitude !== null
        ? { latitude: Number(center.latitude), longitude: Number(center.longitude) }
        : null,
      phone: center.phone, hours: center.hours,
      open: center.isOpen, wait: `${center.estimatedWaitMinutes} min`, stock: center.medicines[0] ? stockLabel[center.medicines[0].status] : 'Sin stock', services: center.services.map((service) => service.name), isOperational: true, locationStatus: 'VERIFIED',
    };
  }

  private toPublicCatalog(center: { id: string; name: string; macrodistrict: string; level: number; address: string | null; latitude: unknown; longitude: unknown; locationStatus: string }) {
    return {
      id: center.id, name: center.name, kind: center.level === 1 ? 'Centro municipal' : 'Hospital municipal', network: 'Red municipal', macrodistrict: center.macrodistrict, level: center.level,
      address: center.address ?? `Ubicación pendiente de verificación · ${center.macrodistrict}`,
      coordinates: center.latitude !== null && center.longitude !== null ? { latitude: Number(center.latitude), longitude: Number(center.longitude) } : null,
      phone: null, hours: null, open: false, wait: 'Información en validación', stock: 'Sin stock', services: [], isOperational: false, locationStatus: center.locationStatus,
    };
  }
}
