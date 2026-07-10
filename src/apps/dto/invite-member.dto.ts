// cotebek/src/apps/dto/invite-member.dto.ts
import { IsEmail, IsOptional, IsIn } from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsIn(['STAFF', 'ADMIN'])
  role?: 'STAFF' | 'ADMIN';
}
