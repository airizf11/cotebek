// cotebek/src/common/controllers/audit-logs.controller.ts
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { AuditService } from '../services/audit.service';
import { PaginationDto } from '../dto/pagination.dto';
import { DualAuthGuard } from '../../auth/dual-auth/dual-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { APP_ROLES } from '../constants/enums.constant';

@ApiTags('Audit Logs')
@ApiSecurity('ApiKey')
@ApiBearerAuth('JWT')
@Controller('audit-logs')
@UseGuards(DualAuthGuard, RolesGuard)
export class AuditLogsController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(APP_ROLES.OWNER)
  @ApiOperation({ summary: 'Get audit log history for this app' })
  findAll(@Req() req: any, @Query() pagination: PaginationDto) {
    return this.auditService.findAll(req.appInfo.id, pagination);
  }
}
