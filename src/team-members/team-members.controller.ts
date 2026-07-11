// cotebek/src/team-members/team-members.controller.ts
import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';
import { TeamMembersService } from './team-members.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { DualAuthGuard } from '../auth/dual-auth/dual-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { APP_ROLES } from '../common/constants/enums.constant';

@ApiTags('Team Members')
@ApiSecurity('ApiKey')
@ApiBearerAuth('JWT')
@Controller('team-members')
@UseGuards(DualAuthGuard, RolesGuard)
export class TeamMembersController {
  constructor(private readonly teamMembersService: TeamMembersService) {}

  @Post()
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN)
  create(@Req() req: any, @Body() dto: CreateTeamMemberDto) {
    return this.teamMembersService.create(
      req.appInfo.id,
      dto,
      req.user?.id,
      req.ip,
    );
  }

  @Get()
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  findAll(@Req() req: any) {
    return this.teamMembersService.findAll(req.appInfo.id);
  }
}
