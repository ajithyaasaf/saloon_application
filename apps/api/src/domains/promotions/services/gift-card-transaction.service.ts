import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateGiftCardTransactionData,
  SearchGiftCardTransactionQueryDto,
} from '../dto/gift-card.dto';
import { GiftCardTransactionEntity } from '../entities/gift-card.entity';
import {
  GiftCardRepository,
  GiftCardTransactionRepository,
} from '../repositories/gift-card.repository';

@Injectable()
export class GiftCardTransactionService {
  constructor(
    private readonly txRepo: GiftCardTransactionRepository,
    private readonly cardRepo: GiftCardRepository,
  ) {}

  public async recordTransaction(
    data: CreateGiftCardTransactionData,
  ): Promise<GiftCardTransactionEntity> {
    const card = await this.cardRepo.findById(data.giftCardId);
    if (!card) {
      throw new NotFoundException(`Gift card with id ${data.giftCardId} not found.`);
    }

    const tx = await this.txRepo.create(data);
    return new GiftCardTransactionEntity(tx);
  }

  public async getTransactionsByGiftCard(
    giftCardId: string,
  ): Promise<GiftCardTransactionEntity[]> {
    const txs = await this.txRepo.findByGiftCard(giftCardId);
    return txs.map((t) => new GiftCardTransactionEntity(t));
  }

  public async getTransactionsByBooking(
    bookingId: string,
  ): Promise<GiftCardTransactionEntity[]> {
    const txs = await this.txRepo.findByBooking(bookingId);
    return txs.map((t) => new GiftCardTransactionEntity(t));
  }

  public async getLedgerBalance(giftCardId: string): Promise<number> {
    return this.txRepo.getLedgerBalance(giftCardId);
  }

  public async searchTransactions(
    query: SearchGiftCardTransactionQueryDto,
  ): Promise<{ data: GiftCardTransactionEntity[]; total: number }> {
    const res = await this.txRepo.search(query);
    return {
      data: res.data.map((t) => new GiftCardTransactionEntity(t)),
      total: res.total,
    };
  }
}
