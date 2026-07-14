// cotebek/src/raw-materials/dto/create-raw-material.dto.ts
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateRawMaterialDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}
