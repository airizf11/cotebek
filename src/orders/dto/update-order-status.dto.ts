// cotebek/src/orders/dto/update-order-status.dto.ts
import { IsEnum } from 'class-validator';
import { OrderStatus } from 'src/common/constants/enums.constant';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, {
    message: 'Status must be one of: RECEIVED, IN_PROCESS, READY, DONE.',
  })
  status: OrderStatus;
}
