// cotebek/src/items/dto/query-item.dto.ts
import { IsOptional, IsBooleanString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryItemDto extends PaginationDto {
  @IsOptional()
  @IsBooleanString()
  includeInactive?: string;
}
