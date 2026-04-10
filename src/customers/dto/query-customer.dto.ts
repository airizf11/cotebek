// cotebek/src/customers/dto/query-customer.dto.ts
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryCustomerDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string; // search by name or phone

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  tag?: string; // filter by single tag
}