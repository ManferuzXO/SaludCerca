import { IsLatitude, IsLongitude, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  slotId!: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @Matches(/^[0-9A-Za-z -]{5,20}$/)
  ci!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  insuranceProvider!: string;

}
