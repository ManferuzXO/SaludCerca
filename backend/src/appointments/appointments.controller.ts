import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() data: CreateAppointmentDto) {
    return this.appointments.create(request.user!.sub, data.slotId, data.latitude, data.longitude);
  }

  @Get('me')
  findMine(@Req() request: AuthenticatedRequest) {
    return this.appointments.findMine(request.user!.sub);
  }

  @Delete(':id')
  cancel(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.appointments.cancel(request.user!.sub, id);
  }
}
