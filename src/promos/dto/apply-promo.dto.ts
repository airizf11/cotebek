// cotebek/src/promos/dto/apply-promo.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class ApplyPromoDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
