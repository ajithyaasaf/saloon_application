import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/dto/token-payload.dto';
import { AdminListUsersDto } from './dto/admin-list-users.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangePhoneDto } from './dto/change-phone.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { PaginatedUsersDto } from './dto/user-summary.dto';
import { UsersService } from './users.service';

/**
 * UsersController — REST API endpoints for User Management and Profile Lifecycle.
 *
 * Phase 8.0
 *
 * Architecture ref: Phase 8.0 §4, §8
 *
 * Principles:
 *  - Ultra-thin controller layer: ZERO business logic, ZERO database/cache access.
 *  - Delegates all profile operations directly to UsersService.
 *  - Authenticated globally by JwtAuthGuard (configured in AppModule).
 *  - Role-based authorization enforced by RolesGuard via @Roles() decorator.
 *  - Full OpenAPI / Swagger documentation on every endpoint.
 */
@ApiTags('User Management')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── Self-Service Endpoints ────────────────────────────────────────────────

  /**
   * GET /api/v1/users/me
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns full user profile',
    type: UserProfileDto,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiNotFoundResponse({ description: 'User not found or account is inactive' })
  async getMyProfile(@CurrentUser() user: JwtPayload): Promise<UserProfileDto> {
    return this.usersService.getMyProfile(user.sub);
  }

  /**
   * PATCH /api/v1/users/me/profile
   */
  @Patch('me/profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update profile information (name, gender, DOB)' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UserProfileDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input payload' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiUnprocessableEntityResponse({ description: 'Business rule violation (e.g. age under 13)' })
  async updateMyProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
    @Ip() ipAddress: string,
  ): Promise<UserProfileDto> {
    return this.usersService.updateMyProfile(user.sub, dto, ipAddress);
  }

  /**
   * PATCH /api/v1/users/me/preferences
   */
  @Patch('me/preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update locale and consent preferences' })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
    type: UserProfileDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input payload' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  async updateMyPreferences(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdatePreferencesDto,
    @Ip() ipAddress: string,
  ): Promise<UserProfileDto> {
    return this.usersService.updateMyPreferences(user.sub, dto, ipAddress);
  }

  /**
   * POST /api/v1/users/me/avatar
   */
  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('avatar'))
  @ConsumesMultipart()
  @ApiOperation({ summary: 'Upload or replace profile avatar image' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, WebP; max 5MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar uploaded and assigned successfully',
    type: UserProfileDto,
  })
  @ApiBadRequestResponse({ description: 'No file provided or invalid file format' })
  @ApiPayloadTooLargeResponse({ description: 'File size exceeds 5MB limit' })
  @ApiTooManyRequestsResponse({ description: 'Concurrent avatar upload in progress' })
  async uploadAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Ip() ipAddress: string,
  ): Promise<UserProfileDto> {
    return this.usersService.requestAvatarUpload(user.sub, file, ipAddress);
  }

  /**
   * DELETE /api/v1/users/me/avatar
   */
  @Delete('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove profile avatar image' })
  @ApiResponse({
    status: 200,
    description: 'Avatar removed successfully',
    type: UserProfileDto,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  async removeAvatar(
    @CurrentUser() user: JwtPayload,
    @Ip() ipAddress: string,
  ): Promise<UserProfileDto> {
    return this.usersService.removeAvatar(user.sub, ipAddress);
  }

  /**
   * POST /api/v1/users/me/email/request
   */
  @Post('me/email/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate email address change' })
  @ApiResponse({
    status: 200,
    description: 'Verification token dispatched to new email address',
    schema: {
      example: {
        message:
          'If the address is valid, a verification link has been sent. Please check your inbox.',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid email address format' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded (max 3 requests per hour)' })
  async requestEmailChange(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangeEmailDto,
    @Ip() ipAddress: string,
  ): Promise<{ message: string }> {
    return this.usersService.requestEmailChange(user.sub, dto, ipAddress);
  }

  /**
   * POST /api/v1/users/me/email/verify
   */
  @Post('me/email/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm email address change with verification token' })
  @ApiResponse({
    status: 200,
    description: 'Email address updated and verified',
    type: UserProfileDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired verification token' })
  @ApiConflictResponse({ description: 'Email address is already in use by another account' })
  async verifyEmailChange(
    @CurrentUser() user: JwtPayload,
    @Body() dto: VerifyEmailDto,
    @Ip() ipAddress: string,
  ): Promise<UserProfileDto> {
    return this.usersService.verifyEmailChange(user.sub, dto, ipAddress);
  }

  /**
   * POST /api/v1/users/me/phone/request
   */
  @Post('me/phone/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate phone number change' })
  @ApiResponse({
    status: 200,
    description: 'OTP dispatched via SMS to new phone number',
    schema: {
      example: {
        message:
          'If the number is eligible, an OTP has been sent. Please check your messages.',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid phone number format' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded (max 3 requests per 15 min)' })
  async requestPhoneChange(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePhoneDto,
    @Ip() ipAddress: string,
  ): Promise<{ message: string }> {
    return this.usersService.requestPhoneChange(user.sub, dto, ipAddress);
  }

  /**
   * POST /api/v1/users/me/phone/verify
   */
  @Post('me/phone/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm phone number change with OTP' })
  @ApiResponse({
    status: 200,
    description: 'Phone number updated and verified',
    type: UserProfileDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired OTP' })
  @ApiConflictResponse({ description: 'Phone number is already in use by another account' })
  async verifyPhoneChange(
    @CurrentUser() user: JwtPayload,
    @Body() dto: VerifyPhoneDto,
    @Ip() ipAddress: string,
  ): Promise<UserProfileDto> {
    return this.usersService.verifyPhoneChange(user.sub, dto, ipAddress);
  }

  /**
   * POST /api/v1/users/me/delete/request
   */
  @Post('me/delete/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate account self-deletion' })
  @ApiResponse({
    status: 200,
    description: 'Self-deletion confirmation token dispatched',
    schema: {
      example: {
        message:
          'A confirmation token has been sent. Submit it within 30 minutes to complete account deletion.',
      },
    },
  })
  async requestSelfDeletion(
    @CurrentUser() user: JwtPayload,
    @Ip() ipAddress: string,
  ): Promise<{ message: string }> {
    return this.usersService.requestSelfDeletion(user.sub, ipAddress);
  }

  /**
   * POST /api/v1/users/me/delete/confirm
   */
  @Post('me/delete/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm account self-deletion with token' })
  @ApiResponse({
    status: 200,
    description: 'Account soft-deleted and all active sessions revoked',
    schema: {
      example: { message: 'Your account has been deleted successfully.' },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired deletion token' })
  async confirmSelfDeletion(
    @CurrentUser() user: JwtPayload,
    @Body('token') token: string,
    @Ip() ipAddress: string,
  ): Promise<{ message: string }> {
    return this.usersService.confirmSelfDeletion(user.sub, token, ipAddress);
  }

  // ─── Admin Endpoints ───────────────────────────────────────────────────────

  /**
   * GET /api/v1/users
   */
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List users with pagination, filters, and search (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated user list',
    type: PaginatedUsersDto,
  })
  @ApiForbiddenResponse({ description: 'Role insufficient (SUPER_ADMIN or SUPPORT_AGENT required)' })
  async listUsers(
    @CurrentUser() user: JwtPayload,
    @Query() dto: AdminListUsersDto,
  ): Promise<PaginatedUsersDto> {
    return this.usersService.listUsers(user.sub, dto);
  }

  /**
   * GET /api/v1/users/:userId
   */
  @Get(':userId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get any user profile by ID (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserProfileDto,
  })
  @ApiForbiddenResponse({ description: 'Role insufficient' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async getUserById(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ): Promise<UserProfileDto> {
    return this.usersService.getUserById(user.sub, targetUserId);
  }

  /**
   * PATCH /api/v1/users/:userId
   */
  @Patch(':userId')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user role, active status, or details (Super Admin)' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserProfileDto,
  })
  @ApiForbiddenResponse({ description: 'Super Admin role required or self-demotion attempted' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async adminUpdateUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: AdminUpdateUserDto,
    @Ip() ipAddress: string,
  ): Promise<UserProfileDto> {
    return this.usersService.adminUpdateUser(user.sub, targetUserId, dto, ipAddress);
  }

  /**
   * POST /api/v1/users/:userId/suspend
   */
  @Post(':userId/suspend')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend user account and revoke all active sessions (Super Admin)' })
  @ApiResponse({
    status: 200,
    description: 'User suspended successfully',
    schema: {
      example: { message: 'User account has been suspended and all sessions revoked.' },
    },
  })
  @ApiForbiddenResponse({ description: 'Super Admin role required' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({ description: 'User is already suspended' })
  async suspendUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Ip() ipAddress: string,
  ): Promise<{ message: string }> {
    return this.usersService.suspendUser(user.sub, targetUserId, ipAddress);
  }

  /**
   * POST /api/v1/users/:userId/restore
   */
  @Post(':userId/restore')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore suspended user account (Super Admin)' })
  @ApiResponse({
    status: 200,
    description: 'User restored successfully',
    schema: {
      example: { message: 'User account has been restored.' },
    },
  })
  @ApiForbiddenResponse({ description: 'Super Admin role required' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({ description: 'User account is already active' })
  async restoreUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Ip() ipAddress: string,
  ): Promise<{ message: string }> {
    return this.usersService.restoreUser(user.sub, targetUserId, ipAddress);
  }

  /**
   * DELETE /api/v1/users/:userId
   */
  @Delete(':userId')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete user account and revoke all sessions (Super Admin)' })
  @ApiResponse({
    status: 200,
    description: 'User account soft-deleted successfully',
    schema: {
      example: { message: 'User account has been deleted.' },
    },
  })
  @ApiForbiddenResponse({ description: 'Super Admin role required or self-deletion attempted' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async softDeleteUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Ip() ipAddress: string,
  ): Promise<{ message: string }> {
    return this.usersService.softDeleteUser(user.sub, targetUserId, ipAddress);
  }
}

/** Helper decorator for multipart form data endpoint Swagger annotation. */
function ConsumesMultipart() {
  return ApiConsumes('multipart/form-data');
}
