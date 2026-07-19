import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { PatientAccessDto } from './dto/patient-access.dto';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  create(@Body() data: CreateAppointmentDto) {
    return this.appointments.createForPatient(data);
  }

  @Post('history')
  findPatientHistory(@Body() data: PatientAccessDto) {
    return this.appointments.findByPatient(data);
  }

  @Post(':id/cancel')
  cancelPatient(@Param('id') id: string, @Body() data: PatientAccessDto) {
    return this.appointments.cancelByPatient(id, data);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMine(@Req() request: AuthenticatedRequest) {
    return this.appointments.findMine(request.user!.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  cancel(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.appointments.cancel(request.user!.sub, id);
  }
}
