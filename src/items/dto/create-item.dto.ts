// cotebek/src/items/dto/create-item.dto.ts
import { IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";

export class CreateItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cogs?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}