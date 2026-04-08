// cotebek/src/apps/dto/create-app.dto.ts
import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateAppDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;
}