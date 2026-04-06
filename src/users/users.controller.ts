// cotebek/src/users/users.controller.ts
import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
// import { SessionGuard } from '../auth/session.guard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard) // Seluruh API di sini butuh login (token)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/apps')
  getMyApps(@Req() request: any) {
    // request.user.id ini otomatis diisi oleh SessionGuard di atas!
    const userId = request.user.userId;
    return this.usersService.getMyApps(userId);
  }
}