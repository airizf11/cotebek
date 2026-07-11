// cotebek/src/team-members/team-members.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { and, eq } from 'drizzle-orm';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { AuditService } from 'src/common/services/audit.service';
import { AUDIT_ACTIONS } from 'src/common/constants/enums.constant';

@Injectable()
export class TeamMembersService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private auditService: AuditService,
  ) {}

  async create(
    appId: string,
    dto: CreateTeamMemberDto,
    userId?: string | null,
    ipAddress?: string | null,
  ) {
    const newMember = await this.db
      .insert(schema.teamMembers)
      .values({ appId, name: dto.name, phone: dto.phone ?? null })
      .returning();

    await this.auditService.log({
      appId,
      userId: userId ?? null,
      action: AUDIT_ACTIONS.CREATE_TEAM_MEMBER,
      entity: 'teamMembers',
      entityId: newMember[0].id,
      after: { name: dto.name },
      ipAddress: ipAddress ?? null,
    });

    return { message: 'Team member added.', data: newMember[0] };
  }

  async findAll(appId: string) {
    const members = await this.db
      .select()
      .from(schema.teamMembers)
      .where(
        and(
          eq(schema.teamMembers.appId, appId),
          eq(schema.teamMembers.isActive, true),
        ),
      );

    return { message: 'Team members retrieved.', data: members };
  }
}
