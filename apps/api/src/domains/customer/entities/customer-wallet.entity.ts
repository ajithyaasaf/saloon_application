import { WalletTransactionType } from '@prisma/client';

export class CustomerWalletLedgerEntity {
  id: string;
  customerProfileId: string;
  type: WalletTransactionType;
  amount: number;
  previousBalance: number;
  newBalance: number;
  referenceType?: string | null;
  referenceId?: string | null;
  description?: string | null;
  createdByUserId: string;
  createdAt: Date;

  constructor(partial: Partial<CustomerWalletLedgerEntity>) {
    Object.assign(this, partial);
  }

  public isCredit(): boolean {
    return this.type === WalletTransactionType.CREDIT || this.type === WalletTransactionType.REFUND;
  }

  public isDebit(): boolean {
    return this.type === WalletTransactionType.DEBIT;
  }
}
