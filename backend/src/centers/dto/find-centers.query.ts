import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class FindCentersQuery {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  service?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  openNow?: boolean;
}
