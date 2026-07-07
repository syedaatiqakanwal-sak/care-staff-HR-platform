import { IsNotEmpty, IsUUID } from 'class-validator';

export class FinishPolicyReadingDto {
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;
}

