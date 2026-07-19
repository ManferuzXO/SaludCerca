import { IsString, Matches } from 'class-validator';

export class PatientAccessDto {
  @IsString()
  @Matches(/^[0-9A-Za-z -]{5,20}$/)
  ci!: string;
}
