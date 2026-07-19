import { IsLatitude, IsLongitude, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  slotId!: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;
}
