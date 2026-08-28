import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * DatabaseModule — global module that provides PrismaService to every module
 * in the application without needing an explicit import.
 *
 * Marked as @Global() so all domain modules can inject PrismaService
 * (via their repositories) without importing DatabaseModule explicitly.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
