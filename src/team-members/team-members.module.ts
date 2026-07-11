// cotebek/src/team-members/team-members.module.ts
import { Module } from '@nestjs/common';
import { TeamMembersController } from './team-members.controller';
import { TeamMembersService } from './team-members.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../common/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [TeamMembersController],
  providers: [TeamMembersService],
})
export class TeamMembersModule {}
