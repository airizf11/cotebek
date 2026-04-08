// cotebek/src/apps/apps.controller.ts
import { Controller, Get, Post, Body, UseGuards, Req, Param, Put, Delete } from '@nestjs/common';
import { AppsService } from './apps.service';
import { CreateAppDto } from './dto/create-app.dto';
import { SessionGuard } from '../auth/session.guard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  // 1. BIKIN USAHA BARU (Otomatis jadi Owner)
  @Post()
  @UseGuards(JwtAuthGuard) // Wajib login!
  create(@Req() request: any, @Body() createAppDto: CreateAppDto) {
    const userId = request.user.id; // Dapat dari SessionGuard
    return this.appsService.createAppWithOwner(userId, createAppDto);
  }

  // 2. REQUEST GABUNG USAHA (Untuk Staf/Kasir)
  @Post('join')
  @UseGuards(JwtAuthGuard)
  joinApp(@Req() request: any, @Body() body: { apiKey: string }) {
    const userId = request.user.id;
    return this.appsService.requestJoinApp(userId, body.apiKey);
  }

  // 3. OWNER LIHAT DAFTAR KARYAWAN (Termasuk yang pending)
  @Get(':appId/members')
  @UseGuards(JwtAuthGuard)
  getMembers(@Req() request: any, @Param('appId') appId: string) {
    const userId = request.user.id;
    return this.appsService.getAppMembers(userId, appId);
  }

  // 4. APPROVE KARYAWAN
  @Put(':appId/members/:targetUserId/approve')
  @UseGuards(JwtAuthGuard)
  approveMember(
    @Req() request: any, 
    @Param('appId') appId: string, 
    @Param('targetUserId') targetUserId: string
  ) {
    const ownerId = request.user.id;
    return this.appsService.approveMember(ownerId, appId, targetUserId);
  }

  // -— tambah DELETE
@Delete(':appId/members/:targetUserId') // ✅ new endpoint
@UseGuards(JwtAuthGuard)
removeMember(
  @Req() request: any,
  @Param('appId') appId: string,
  @Param('targetUserId') targetUserId: string,
) {
  const ownerId = request.user.id;
  return this.appsService.removeMember(ownerId, appId, targetUserId);
}
}