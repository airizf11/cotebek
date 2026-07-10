// cotebek/src/orders/dto/mark-paid.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkPaidDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentMethod?: string;
}
