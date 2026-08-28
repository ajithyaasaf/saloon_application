import { ConflictException, Injectable } from '@nestjs/common';
import {
  GiftCard,
  GiftCardStatus,
  GiftCardTransaction,
  GiftCardTransactionType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import {
  CreateGiftCardData,
  CreateGiftCardTransactionData,
  SearchGiftCardQueryDto,
  SearchGiftCardTransactionQueryDto,
  UpdateGiftCardData,
} from '../dto/gift-card.dto';
import {
  IGiftCardRepository,
  IGiftCardTransactionRepository,
} from './interfaces/gift-card.repository.interface';

@Injectable()
export class GiftCardRepository implements IGiftCardRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, salonId?: string, tx?: PrismaTransaction): Promise<GiftCard | null> {
    const client = tx ?? this.db;
    const where: Prisma.GiftCardWhereInput = { id, deletedAt: null };
    if (salonId) where.salonId = salonId;

    return client.giftCard.findFirst({
      where,
      include: {
        purchasedByUser: true,
        transactions: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  public async findByCode(giftCardCode: string, salonId?: string, tx?: PrismaTransaction): Promise<GiftCard | null> {
    const client = tx ?? this.db;
    const where: Prisma.GiftCardWhereInput = {
      giftCardCode: giftCardCode.toUpperCase().trim(),
      deletedAt: null,
    };
    if (salonId) where.salonId = salonId;

    return client.giftCard.findFirst({
      where,
      include: {
        purchasedByUser: true,
      },
    });
  }

  public async findActiveByCode(
    giftCardCode: string,
    salonId?: string,
    checkDate = new Date(),
    tx?: PrismaTransaction,
  ): Promise<GiftCard | null> {
    const client = tx ?? this.db;
    const where: Prisma.GiftCardWhereInput = {
      giftCardCode: giftCardCode.toUpperCase().trim(),
      status: { in: [GiftCardStatus.ACTIVE, GiftCardStatus.PARTIALLY_REDEEMED] },
      currentBalance: { gt: 0 },
      expiresAt: { gte: checkDate },
      deletedAt: null,
    };
    if (salonId) where.salonId = salonId;

    return client.giftCard.findFirst({
      where,
      include: {
        purchasedByUser: true,
      },
    });
  }

  public async findBySalon(salonId: string, status?: GiftCardStatus, tx?: PrismaTransaction): Promise<GiftCard[]> {
    const client = tx ?? this.db;
    const where: Prisma.GiftCardWhereInput = { salonId, deletedAt: null };
    if (status) where.status = status;

    return client.giftCard.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        purchasedByUser: true,
      },
    });
  }

  public async findByPurchaser(
    purchasedByUserId: string,
    salonId?: string,
    tx?: PrismaTransaction,
  ): Promise<GiftCard[]> {
    const client = tx ?? this.db;
    const where: Prisma.GiftCardWhereInput = { purchasedByUserId, deletedAt: null };
    if (salonId) where.salonId = salonId;

    return client.giftCard.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByRecipient(
    recipientEmailOrPhone: string,
    salonId?: string,
    tx?: PrismaTransaction,
  ): Promise<GiftCard[]> {
    const client = tx ?? this.db;
    const where: Prisma.GiftCardWhereInput = {
      OR: [
        { recipientEmail: { equals: recipientEmailOrPhone, mode: 'insensitive' } },
        { recipientPhone: recipientEmailOrPhone },
      ],
      deletedAt: null,
    };
    if (salonId) where.salonId = salonId;

    return client.giftCard.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByStatus(status: GiftCardStatus, salonId?: string, tx?: PrismaTransaction): Promise<GiftCard[]> {
    const client = tx ?? this.db;
    const where: Prisma.GiftCardWhereInput = { status, deletedAt: null };
    if (salonId) where.salonId = salonId;

    return client.giftCard.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  public async search(
    query: SearchGiftCardQueryDto,
    tx?: PrismaTransaction,
  ): Promise<{ data: GiftCard[]; total: number }> {
    const client = tx ?? this.db;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.GiftCardWhereInput = { deletedAt: null };
    if (query.salonId) where.salonId = query.salonId;
    if (query.status) where.status = query.status;
    if (query.giftCardCode) {
      where.giftCardCode = { contains: query.giftCardCode.toUpperCase(), mode: 'insensitive' };
    }
    if (query.purchasedByUserId) where.purchasedByUserId = query.purchasedByUserId;
    if (query.recipientEmail) {
      where.recipientEmail = { contains: query.recipientEmail, mode: 'insensitive' };
    }
    if (query.recipientPhone) {
      where.recipientPhone = { contains: query.recipientPhone };
    }
    if (query.isExpired !== undefined) {
      const now = new Date();
      where.expiresAt = query.isExpired ? { lt: now } : { gte: now };
    }

    const orderByField = query.sortBy ?? 'createdAt';
    const orderDirection = query.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      client.giftCard.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderDirection },
        include: {
          purchasedByUser: true,
        },
      }),
      client.giftCard.count({ where }),
    ]);

    return { data, total };
  }

  public async count(salonId?: string, status?: GiftCardStatus, tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.db;
    const where: Prisma.GiftCardWhereInput = { deletedAt: null };
    if (salonId) where.salonId = salonId;
    if (status) where.status = status;

    return client.giftCard.count({ where });
  }

  public async create(data: CreateGiftCardData, tx?: PrismaTransaction): Promise<GiftCard> {
    const client = tx ?? this.db;
    return client.giftCard.create({
      data: {
        giftCardCode: data.giftCardCode.toUpperCase().trim(),
        salonId: data.salonId,
        purchasedByUserId: data.purchasedByUserId ?? null,
        recipientName: data.recipientName ?? null,
        recipientEmail: data.recipientEmail ?? null,
        recipientPhone: data.recipientPhone ?? null,
        personalMessage: data.personalMessage ?? null,
        initialBalance: data.initialBalance,
        currentBalance: data.currentBalance,
        currency: data.currency ?? 'INR',
        status: data.status ?? GiftCardStatus.ACTIVE,
        expiresAt: data.expiresAt,
      },
      include: {
        purchasedByUser: true,
      },
    });
  }

  public async update(
    id: string,
    data: UpdateGiftCardData,
    expectedVersion?: number,
    tx?: PrismaTransaction,
  ): Promise<GiftCard> {
    const client = tx ?? this.db;
    const updateData: Prisma.GiftCardUpdateInput = {
      ...(data.recipientName !== undefined && { recipientName: data.recipientName }),
      ...(data.recipientEmail !== undefined && { recipientEmail: data.recipientEmail }),
      ...(data.recipientPhone !== undefined && { recipientPhone: data.recipientPhone }),
      ...(data.personalMessage !== undefined && { personalMessage: data.personalMessage }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt }),
      version: { increment: 1 },
    };

    try {
      const where: Prisma.GiftCardWhereUniqueInput = { id };
      if (expectedVersion !== undefined) {
        where.version = expectedVersion;
      }

      return await client.giftCard.update({
        where,
        data: updateData,
      });
    } catch (error: any) {
      if (expectedVersion !== undefined && error.code === 'P2025') {
        throw new ConflictException(
          `Optimistic lock failure: GiftCard with id ${id} has been modified concurrently.`,
        );
      }
      throw error;
    }
  }

  public async updateStatus(
    id: string,
    status: GiftCardStatus,
    expectedVersion?: number,
    tx?: PrismaTransaction,
  ): Promise<GiftCard> {
    return this.update(id, { status }, expectedVersion, tx);
  }

  public async updateBalance(
    id: string,
    newBalance: number,
    expectedVersion?: number,
    tx?: PrismaTransaction,
  ): Promise<GiftCard> {
    const client = tx ?? this.db;
    try {
      const where: Prisma.GiftCardWhereUniqueInput = { id };
      if (expectedVersion !== undefined) {
        where.version = expectedVersion;
      }

      let status: GiftCardStatus | undefined;
      if (newBalance === 0) {
        status = GiftCardStatus.FULLY_REDEEMED;
      } else {
        status = GiftCardStatus.PARTIALLY_REDEEMED;
      }

      return await client.giftCard.update({
        where,
        data: {
          currentBalance: newBalance,
          ...(status && { status }),
          version: { increment: 1 },
        },
      });
    } catch (error: any) {
      if (expectedVersion !== undefined && error.code === 'P2025') {
        throw new ConflictException(
          `Optimistic lock failure: GiftCard with id ${id} has been modified concurrently.`,
        );
      }
      throw error;
    }
  }

  public async debitBalance(
    id: string,
    amount: number,
    expectedVersion?: number,
    tx?: PrismaTransaction,
  ): Promise<GiftCard> {
    const client = tx ?? this.db;
    const card = await client.giftCard.findUnique({ where: { id } });
    if (!card) throw new ConflictException(`GiftCard with id ${id} not found.`);
    if (card.currentBalance < amount) {
      throw new ConflictException(
        `Insufficient gift card balance. Available: ${card.currentBalance}, Requested: ${amount}`,
      );
    }

    const nextBalance = card.currentBalance - amount;
    const status =
      nextBalance === 0 ? GiftCardStatus.FULLY_REDEEMED : GiftCardStatus.PARTIALLY_REDEEMED;

    try {
      const where: Prisma.GiftCardWhereUniqueInput = { id };
      if (expectedVersion !== undefined) {
        where.version = expectedVersion;
      }

      return await client.giftCard.update({
        where,
        data: {
          currentBalance: nextBalance,
          status,
          version: { increment: 1 },
        },
      });
    } catch (error: any) {
      if (expectedVersion !== undefined && error.code === 'P2025') {
        throw new ConflictException(
          `Optimistic lock failure: GiftCard with id ${id} has been modified concurrently.`,
        );
      }
      throw error;
    }
  }

  public async creditBalance(
    id: string,
    amount: number,
    expectedVersion?: number,
    tx?: PrismaTransaction,
  ): Promise<GiftCard> {
    const client = tx ?? this.db;
    const card = await client.giftCard.findUnique({ where: { id } });
    if (!card) throw new ConflictException(`GiftCard with id ${id} not found.`);

    const nextBalance = Math.min(card.currentBalance + amount, card.initialBalance);
    const status =
      nextBalance === card.initialBalance ? GiftCardStatus.ACTIVE : GiftCardStatus.PARTIALLY_REDEEMED;

    try {
      const where: Prisma.GiftCardWhereUniqueInput = { id };
      if (expectedVersion !== undefined) {
        where.version = expectedVersion;
      }

      return await client.giftCard.update({
        where,
        data: {
          currentBalance: nextBalance,
          status,
          version: { increment: 1 },
        },
      });
    } catch (error: any) {
      if (expectedVersion !== undefined && error.code === 'P2025') {
        throw new ConflictException(
          `Optimistic lock failure: GiftCard with id ${id} has been modified concurrently.`,
        );
      }
      throw error;
    }
  }

  public async freeze(id: string, expectedVersion?: number, tx?: PrismaTransaction): Promise<GiftCard> {
    return this.update(id, { status: GiftCardStatus.FROZEN }, expectedVersion, tx);
  }

  public async cancel(id: string, expectedVersion?: number, tx?: PrismaTransaction): Promise<GiftCard> {
    return this.update(id, { status: GiftCardStatus.CANCELLED }, expectedVersion, tx);
  }

  public async expire(id: string, expectedVersion?: number, tx?: PrismaTransaction): Promise<GiftCard> {
    return this.update(id, { status: GiftCardStatus.EXPIRED }, expectedVersion, tx);
  }

  public async softDelete(id: string, salonId?: string, tx?: PrismaTransaction): Promise<GiftCard> {
    const client = tx ?? this.db;
    const where: Prisma.GiftCardWhereInput = { id };
    if (salonId) where.salonId = salonId;

    const existing = await client.giftCard.findFirst({ where });
    if (!existing) {
      throw new ConflictException(`GiftCard with id ${id} not found.`);
    }

    return client.giftCard.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: GiftCardStatus.CANCELLED,
        version: { increment: 1 },
      },
    });
  }
}

@Injectable()
export class GiftCardTransactionRepository implements IGiftCardTransactionRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<GiftCardTransaction | null> {
    const client = tx ?? this.db;
    return client.giftCardTransaction.findUnique({
      where: { id },
      include: {
        giftCard: true,
        booking: true,
        invoice: true,
        performedByUser: true,
      },
    });
  }

  public async findByGiftCard(giftCardId: string, tx?: PrismaTransaction): Promise<GiftCardTransaction[]> {
    const client = tx ?? this.db;
    return client.giftCardTransaction.findMany({
      where: { giftCardId },
      orderBy: { createdAt: 'desc' },
      include: {
        booking: true,
        invoice: true,
      },
    });
  }

  public async findByBooking(bookingId: string, tx?: PrismaTransaction): Promise<GiftCardTransaction[]> {
    const client = tx ?? this.db;
    return client.giftCardTransaction.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
      include: { giftCard: true },
    });
  }

  public async findByInvoice(invoiceId: string, tx?: PrismaTransaction): Promise<GiftCardTransaction[]> {
    const client = tx ?? this.db;
    return client.giftCardTransaction.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
      include: { giftCard: true },
    });
  }

  public async findByUser(userId: string, tx?: PrismaTransaction): Promise<GiftCardTransaction[]> {
    const client = tx ?? this.db;
    return client.giftCardTransaction.findMany({
      where: { performedByUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: { giftCard: true },
    });
  }

  public async findByType(
    transactionType: GiftCardTransactionType,
    giftCardId?: string,
    tx?: PrismaTransaction,
  ): Promise<GiftCardTransaction[]> {
    const client = tx ?? this.db;
    const where: Prisma.GiftCardTransactionWhereInput = { transactionType };
    if (giftCardId) where.giftCardId = giftCardId;

    return client.giftCardTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  public async search(
    query: SearchGiftCardTransactionQueryDto,
    tx?: PrismaTransaction,
  ): Promise<{ data: GiftCardTransaction[]; total: number }> {
    const client = tx ?? this.db;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.GiftCardTransactionWhereInput = {};
    if (query.giftCardId) where.giftCardId = query.giftCardId;
    if (query.bookingId) where.bookingId = query.bookingId;
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.transactionType) where.transactionType = query.transactionType;
    if (query.performedByUserId) where.performedByUserId = query.performedByUserId;

    const orderByField = query.sortBy ?? 'createdAt';
    const orderDirection = query.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      client.giftCardTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderDirection },
        include: {
          giftCard: true,
          booking: true,
          invoice: true,
        },
      }),
      client.giftCardTransaction.count({ where }),
    ]);

    return { data, total };
  }

  public async create(data: CreateGiftCardTransactionData, tx?: PrismaTransaction): Promise<GiftCardTransaction> {
    const client = tx ?? this.db;
    return client.giftCardTransaction.create({
      data: {
        giftCardId: data.giftCardId,
        bookingId: data.bookingId ?? null,
        invoiceId: data.invoiceId ?? null,
        transactionType: data.transactionType,
        amount: data.amount,
        balanceBefore: data.balanceBefore,
        balanceAfter: data.balanceAfter,
        notes: data.notes ?? null,
        performedByUserId: data.performedByUserId ?? null,
      },
    });
  }

  public async createMany(data: CreateGiftCardTransactionData[], tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.db;
    const res = await client.giftCardTransaction.createMany({
      data: data.map((d) => ({
        giftCardId: d.giftCardId,
        bookingId: d.bookingId ?? null,
        invoiceId: d.invoiceId ?? null,
        transactionType: d.transactionType,
        amount: d.amount,
        balanceBefore: d.balanceBefore,
        balanceAfter: d.balanceAfter,
        notes: d.notes ?? null,
        performedByUserId: d.performedByUserId ?? null,
      })),
    });
    return res.count;
  }

  public async aggregateCredits(giftCardId: string, tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.db;
    const aggregate = await client.giftCardTransaction.aggregate({
      where: {
        giftCardId,
        transactionType: {
          in: [
            GiftCardTransactionType.ISSUE,
            GiftCardTransactionType.REFUND_CREDIT,
            GiftCardTransactionType.MANUAL_ADJUSTMENT,
          ],
        },
      },
      _sum: { amount: true },
    });
    return aggregate._sum.amount ?? 0;
  }

  public async aggregateDebits(giftCardId: string, tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.db;
    const aggregate = await client.giftCardTransaction.aggregate({
      where: {
        giftCardId,
        transactionType: {
          in: [GiftCardTransactionType.REDEMPTION, GiftCardTransactionType.EXPIRATION_FORFEIT],
        },
      },
      _sum: { amount: true },
    });
    return aggregate._sum.amount ?? 0;
  }

  public async getLedgerBalance(giftCardId: string, tx?: PrismaTransaction): Promise<number> {
    const [credits, debits] = await Promise.all([
      this.aggregateCredits(giftCardId, tx),
      this.aggregateDebits(giftCardId, tx),
    ]);
    return credits - debits;
  }
}
