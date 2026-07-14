// cotebek/src/transactions/dto/create-transaction.dto.ts
import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  MaxLength,
  IsDateString,
  IsIn,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import {
  TransactionCategory,
  TransactionType,
} from 'src/common/constants/enums.constant';

class TxItemDto {
  @IsOptional()
  @IsUUID()
  rawMaterialId?: string;

  @IsString()
  @MaxLength(255)
  itemName: string;

  @IsNumber()
  @Min(0)
  qty: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  subtotal: number;
}

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsEnum(TransactionCategory)
  category: TransactionCategory;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fee?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  metadata?: any;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @IsOptional()
  @IsIn(['PAID', 'UNPAID'])
  paymentStatus?: 'PAID' | 'UNPAID';

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsUUID()
  teamMemberId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TxItemDto)
  items?: TxItemDto[];
}
