// cotebek/src/apps/apps.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { AppsService } from './apps.service';
import { CreateAppDto } from './dto/create-app.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { JoinAppDto } from './dto/join-app.dto';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { APP_ROLES } from 'src/common/constants/enums.constant';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('Apps')
@ApiBearerAuth('JWT')
@Controller('apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  // 1. BIKIN USAHA BARU (Otomatis jadi Owner)
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new app (caller becomes Owner)' })
  @ApiResponse({ status: 201, description: 'App created successfully.' })
  create(@Req() req: any, @Body() dto: CreateAppDto) {
    return this.appsService.createAppWithOwner(req.user.id, dto, req.ip);
  }

  // 2. REQUEST GABUNG USAHA (Untuk Staf/Kasir)
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @Post('join')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Request to join an existing app via API Key' })
  @ApiResponse({ status: 201, description: 'Join request sent.' })
  @ApiResponse({ status: 400, description: 'Already registered in this app.' })
  joinApp(@Req() req: any, @Body() dto: JoinAppDto) {
    return this.appsService.requestJoinApp(req.user.id, dto.apiKey, req.ip);
  }

  // 3. OWNER LIHAT DAFTAR KARYAWAN (Termasuk yang pending)
  @Get(':appId/members')
  @UseGuards(JwtAuthGuard)
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN)
  @ApiOperation({ summary: 'Get member list of an app (Owner/Admin only)' })
  @ApiResponse({ status: 200, description: 'Member list retrieved.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  getMembers(
    @Req() req: any,
    @Param('appId') appId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.appsService.getAppMembers(req.user.id, appId, pagination);
  }

  // 4. APPROVE KARYAWAN
  @Put(':appId/members/:targetUserId/approve')
  @UseGuards(JwtAuthGuard)
  @Roles(APP_ROLES.OWNER)
  @ApiOperation({ summary: 'Approve a pending member (Owner only)' })
  @ApiResponse({ status: 200, description: 'Member approved.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Member not found or not PENDING.' })
  approveMember(
    @Req() req: any,
    @Param('appId') appId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.appsService.approveMember(
      req.user.id,
      appId,
      targetUserId,
      req.ip,
    );
  }

  // -— DELETE
  @Delete(':appId/members/:targetUserId')
  @UseGuards(JwtAuthGuard)
  @Roles(APP_ROLES.OWNER)
  @ApiOperation({ summary: 'Remove a member from app (Owner only)' })
  @ApiResponse({ status: 200, description: 'Member removed.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  removeMember(
    @Req() req: any,
    @Param('appId') appId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.appsService.removeMember(
      req.user.id,
      appId,
      targetUserId,
      req.ip,
    );
  }
}
