import { IsNotEmpty, IsUUID } from 'class-validator';

export class StartPolicyReadingDto {
  @IsUUID()
  @IsNotEmpty()
  policyId: string;
}

