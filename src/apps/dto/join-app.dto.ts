// cotebek/src/apps/dto/join-app.dto.ts
import { IsString, Matches } from 'class-validator';

export class JoinAppDto {
  @IsString()
  @Matches(/^app_[a-f0-9]{32}$/, {
    message: 'Invalid API Key format.',
  })
  apiKey: string;
}