// cotebek/src/promos/dto/create-promo.dto.ts
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  IsDateString,
  MaxLength,
  Min,
  IsInt,
} from 'class-validator';
import { PromoType, PromoScope } from 'src/common/constants/enums.constant';

export class CreatePromoDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string; // null = promo tanpa kode, apply manual by staff

  @IsEnum(PromoType)
  type: PromoType;

  @IsNumber()
  @Min(0)
  value: number; // 20 = 20% atau Rp20.000 tergantung type

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrder?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number; // cap untuk PERCENTAGE, e.g. max Rp50.000

  @IsOptional()
  @IsEnum(PromoScope)
  scope?: PromoScope; // default ALL

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  itemIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  customerIds?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number; // null = unlimited

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsagePerCustomer?: number;
}
