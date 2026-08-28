import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { UserRepository } from './repositories/user.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * UsersModule — Encapsulates User Management controllers, services, and repositories.
 *
 * Imports AuthModule to consume SessionRepository for session revocation during
 * account suspension and deletion without modifying AuthModule.
 * Imports MediaModule to consume Phase 20 File & Media storage engine capabilities.
 * Exports UserRepository for future cross-domain use (e.g. SalonModule, StaffModule).
 *
 * Phase 8.0 / Phase 21
 */
@Module({
  imports: [AuthModule, MediaModule],
  controllers: [UsersController],
  providers: [UsersService, UserRepository],
  exports: [UsersService, UserRepository],
})
export class UsersModule {}
