// cotebek/src/team-members/dto/create-team-member.dto.ts
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateTeamMemberDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
