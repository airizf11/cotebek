// cotebek/src/transactions/dto/create-transaction.dto.ts
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import {
  TransactionCategory,
  TransactionType,
} from 'src/common/constants/enums.constant';

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsEnum(TransactionCategory)
  category: TransactionCategory;

  @IsNumber()
  @Min(0)
  amount: number;

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
}
