// cotebek/src/apps/apps.controller.ts
import { Controller, Get, Post, Body, UseGuards, Req, Param, Put, Delete, Query } from '@nestjs/common';
import { AppsService } from './apps.service';
import { CreateAppDto } from './dto/create-app.dto';
// import { SessionGuard } from '../auth/session.guard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { JoinAppDto } from './dto/join-app.dto';

@Controller('apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  // 1. BIKIN USAHA BARU (Otomatis jadi Owner)
  @Post()
@UseGuards(JwtAuthGuard)
create(@Req() req: any, @Body() dto: CreateAppDto) {
  return this.appsService.createAppWithOwner(req.user.id, dto, req.ip); // ✅
}

  // 2. REQUEST GABUNG USAHA (Untuk Staf/Kasir)
  @Post('join')
  @UseGuards(JwtAuthGuard)
  joinApp(@Req() req: any, @Body() dto: JoinAppDto) { // ✅ was: body: { apiKey: string }
    return this.appsService.requestJoinApp(req.user.id, dto.apiKey, req.ip);
  }

  // 3. OWNER LIHAT DAFTAR KARYAWAN (Termasuk yang pending)
  @Get(':appId/members')
@UseGuards(JwtAuthGuard)
getMembers(
  @Req() req: any,
  @Param('appId') appId: string,
  @Query() pagination: PaginationDto, // ✅
) {
  return this.appsService.getAppMembers(req.user.id, appId, pagination);
}

  // 4. APPROVE KARYAWAN
  @Put(':appId/members/:targetUserId/approve')
@UseGuards(JwtAuthGuard)
approveMember(@Req() req: any, @Param('appId') appId: string, @Param('targetUserId') targetUserId: string) {
  return this.appsService.approveMember(req.user.id, appId, targetUserId, req.ip); // ✅
}

  // -— tambah DELETE
@Delete(':appId/members/:targetUserId')
@UseGuards(JwtAuthGuard)
removeMember(@Req() req: any, @Param('appId') appId: string, @Param('targetUserId') targetUserId: string) {
  return this.appsService.removeMember(req.user.id, appId, targetUserId, req.ip); // ✅
}
}