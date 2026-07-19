import { IsString, MaxLength, MinLength } from 'class-validator';

export class SpeakDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1400)
  text!: string;
}
