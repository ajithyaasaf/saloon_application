import { GiftCard, GiftCardStatus, GiftCardTransaction, GiftCardTransactionType } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import {
  CreateGiftCardData,
  CreateGiftCardTransactionData,
  SearchGiftCardQueryDto,
  SearchGiftCardTransactionQueryDto,
  UpdateGiftCardData,
} from '../../dto/gift-card.dto';

export interface IGiftCardRepository {
  findById(id: string, salonId?: string, tx?: PrismaTransaction): Promise<GiftCard | null>;
  findByCode(giftCardCode: string, salonId?: string, tx?: PrismaTransaction): Promise<GiftCard | null>;
  findActiveByCode(giftCardCode: string, salonId?: string, checkDate?: Date, tx?: PrismaTransaction): Promise<GiftCard | null>;
  findBySalon(salonId: string, status?: GiftCardStatus, tx?: PrismaTransaction): Promise<GiftCard[]>;
  findByPurchaser(purchasedByUserId: string, salonId?: string, tx?: PrismaTransaction): Promise<GiftCard[]>;
  findByRecipient(recipientEmailOrPhone: string, salonId?: string, tx?: PrismaTransaction): Promise<GiftCard[]>;
  findByStatus(status: GiftCardStatus, salonId?: string, tx?: PrismaTransaction): Promise<GiftCard[]>;
  search(query: SearchGiftCardQueryDto, tx?: PrismaTransaction): Promise<{ data: GiftCard[]; total: number }>;
  count(salonId?: string, status?: GiftCardStatus, tx?: PrismaTransaction): Promise<number>;
  create(data: CreateGiftCardData, tx?: PrismaTransaction): Promise<GiftCard>;
  update(id: string, data: UpdateGiftCardData, expectedVersion?: number, tx?: PrismaTransaction): Promise<GiftCard>;
  updateStatus(id: string, status: GiftCardStatus, expectedVersion?: number, tx?: PrismaTransaction): Promise<GiftCard>;
  updateBalance(id: string, newBalance: number, expectedVersion?: number, tx?: PrismaTransaction): Promise<GiftCard>;
  debitBalance(id: string, amount: number, expectedVersion?: number, tx?: PrismaTransaction): Promise<GiftCard>;
  creditBalance(id: string, amount: number, expectedVersion?: number, tx?: PrismaTransaction): Promise<GiftCard>;
  freeze(id: string, expectedVersion?: number, tx?: PrismaTransaction): Promise<GiftCard>;
  cancel(id: string, expectedVersion?: number, tx?: PrismaTransaction): Promise<GiftCard>;
  expire(id: string, expectedVersion?: number, tx?: PrismaTransaction): Promise<GiftCard>;
  softDelete(id: string, salonId?: string, tx?: PrismaTransaction): Promise<GiftCard>;
}

export interface IGiftCardTransactionRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<GiftCardTransaction | null>;
  findByGiftCard(giftCardId: string, tx?: PrismaTransaction): Promise<GiftCardTransaction[]>;
  findByBooking(bookingId: string, tx?: PrismaTransaction): Promise<GiftCardTransaction[]>;
  findByInvoice(invoiceId: string, tx?: PrismaTransaction): Promise<GiftCardTransaction[]>;
  findByUser(userId: string, tx?: PrismaTransaction): Promise<GiftCardTransaction[]>;
  findByType(transactionType: GiftCardTransactionType, giftCardId?: string, tx?: PrismaTransaction): Promise<GiftCardTransaction[]>;
  search(query: SearchGiftCardTransactionQueryDto, tx?: PrismaTransaction): Promise<{ data: GiftCardTransaction[]; total: number }>;
  create(data: CreateGiftCardTransactionData, tx?: PrismaTransaction): Promise<GiftCardTransaction>;
  createMany(data: CreateGiftCardTransactionData[], tx?: PrismaTransaction): Promise<number>;
  aggregateCredits(giftCardId: string, tx?: PrismaTransaction): Promise<number>;
  aggregateDebits(giftCardId: string, tx?: PrismaTransaction): Promise<number>;
  getLedgerBalance(giftCardId: string, tx?: PrismaTransaction): Promise<number>;
}
