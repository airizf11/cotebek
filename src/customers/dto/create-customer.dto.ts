// cotebek/src/customers/dto/create-customer.dto.ts
import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsArray,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender } from 'src/common/constants/enums.constant';

export class CreateCustomerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @Matches(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, {
    message: 'Invalid Indonesian phone number format.',
  })
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @Type(() => Date)
  birthDate?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressDetail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  village?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/, { message: 'Postal code must be 5 digits.' })
  postalCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
