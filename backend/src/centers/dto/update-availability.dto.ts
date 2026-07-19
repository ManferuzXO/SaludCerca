import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateAvailabilityDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  wait?: string;

  @IsOptional()
  @IsIn(['Disponible', 'Stock bajo', 'Sin stock'])
  stock?: 'Disponible' | 'Stock bajo' | 'Sin stock';
}
