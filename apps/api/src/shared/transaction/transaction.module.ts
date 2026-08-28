import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { TransactionService } from './transaction.service';

/**
 * TransactionModule — Exports TransactionService for cross-domain transaction orchestration.
 */
@Module({
  imports: [DatabaseModule],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
