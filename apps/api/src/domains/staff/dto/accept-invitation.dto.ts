import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty({ description: 'Raw invitation token string received via Email/SMS' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'User ID of the onboarding staff account' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}
