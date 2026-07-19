import { Body, Controller, Get, NotFoundException, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CentersService } from './centers.service';
import { FindCentersQuery } from './dto/find-centers.query';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OperatorGuard } from '../auth/operator.guard';

@Controller('centers')
export class CentersController {
  constructor(private readonly centersService: CentersService) {}

  @Get()
  findAll(@Query() query: FindCentersQuery) {
    return this.centersService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const center = await this.centersService.findOne(id);
    if (!center) throw new NotFoundException(`No existe un centro con id ${id}`);
    return center;
  }

  @Get(':id/availability')
  async availability(@Param('id') id: string) {
    const availability = await this.centersService.availability(id);
    if (!availability) throw new NotFoundException(`No existe un centro con id ${id}`);
    return availability;
  }

  @Get(':id/slots')
  async slots(@Param('id') id: string) {
    const slots = await this.centersService.slots(id);
    if (!slots) throw new NotFoundException(`No existe un centro con id ${id}`);
    return slots;
  }

  @Patch(':id/availability')
  @UseGuards(JwtAuthGuard, OperatorGuard)
  async updateAvailability(@Param('id') id: string, @Body() update: UpdateAvailabilityDto) {
    const availability = await this.centersService.updateAvailability(id, update);
    if (!availability) throw new NotFoundException(`No existe un centro con id ${id}`);
    return availability;
  }
}
