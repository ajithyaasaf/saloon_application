import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WalletTransactionType } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CustomerWalletLedgerDto {
  @Expose()
  @ApiProperty({ description: 'Ledger Entry ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Customer Profile ID' })
  customerProfileId: string;

  @Expose()
  @ApiProperty({ description: 'Transaction Type', enum: WalletTransactionType })
  type: WalletTransactionType;

  @Expose()
  @ApiProperty({ description: 'Amount delta in minor units (+ or -)' })
  amount: number;

  @Expose()
  @ApiProperty({ description: 'Previous Balance in minor units' })
  previousBalance: number;

  @Expose()
  @ApiProperty({ description: 'New Balance in minor units' })
  newBalance: number;

  @Expose()
  @ApiPropertyOptional({ description: 'Reference Type' })
  referenceType?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Reference ID' })
  referenceId?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Description' })
  description?: string;

  @Expose()
  @ApiProperty({ description: 'Created At' })
  createdAt: Date;
}
