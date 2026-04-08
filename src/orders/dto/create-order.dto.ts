// cotebek/src/orders/dto/create-order.dto.ts
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsOptional()
  @IsString()
  itemId?: string;

  @IsString()
  @MaxLength(255)
  itemName: string;

  @IsNumber()
  @Min(0)
  qty: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  cogs: number;

  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsOptional()
  metadata?: any;
}

export class CreateOrderDto {
  @IsString()
  @MaxLength(100)
  orderNumber: string;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsNumber()
  @Min(0)
  totalCogs: number;

  @IsString()
  @MaxLength(100)
  paymentMethod: string;

  @IsOptional()
  metadata?: any;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)        // ← diperlukan class-transformer untuk nested validation
  items: OrderItemDto[];
}