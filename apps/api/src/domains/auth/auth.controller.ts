import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiHeaders,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { JwtPayload } from './dto/token-payload.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

/**
 * AuthController — REST API endpoints for Authentication and Session Management.
 *
 * Phase 7.6
 *
 * Architecture ref: Phase 5 §5, Phase 7 §1 – §5
 *
 * Principles:
 *  - Ultra-thin controller layer: ZERO business logic, ZERO database/cache access.
 *  - Delegates all authentication operations directly to AuthService.
 *  - Uses NestJS Global Pipes for DTO validation.
 *  - Comprehensive OpenAPI / Swagger annotations.
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Public Endpoints ────────────────────────────────────────────────────────

  /**
   * POST /api/v1/auth/otp/request
   */
  @Public()
  @Throttle({ otp: { limit: 5, ttl: 60000 } })
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a 6-digit OTP via SMS for phone authentication' })
  @ApiResponse({
    status: 200,
    description: 'OTP dispatched successfully via SMS',
    schema: {
      example: { message: 'OTP sent successfully' },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid phone number format' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded (max 3 requests per 15 min)' })
  async requestOtp(@Body() dto: SendOtpDto): Promise<{ message: string }> {
    return this.authService.requestOtp(dto);
  }

  /**
   * POST /api/v1/auth/otp/send (Alias for otp/request)
   */
  @Public()
  @Throttle({ otp: { limit: 5, ttl: 60000 } })
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alias: Send OTP code to phone' })
  async sendOtp(@Body() dto: SendOtpDto): Promise<{ message: string }> {
    return this.authService.requestOtp(dto);
  }

  /**
   * POST /api/v1/auth/otp/verify
   */
  @Public()
  @Throttle({ otp: { limit: 5, ttl: 60000 } })
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP code and authenticate customer account' })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully; returns access token and refresh token',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid payload' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired OTP' })
  @ApiTooManyRequestsResponse({ description: 'Account locked due to 3 consecutive failed attempts' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ipAddress: string,
  ): Promise<AuthResponseDto> {
    return this.authService.verifyOtp(dto, userAgent, ipAddress);
  }

  /**
   * POST /api/v1/auth/login
   */
  @Public()
  @Throttle({ login: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate B2B staff/owner/admin via email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful; returns access token and refresh token',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request payload' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiTooManyRequestsResponse({ description: 'Account locked due to 5 consecutive failed login attempts' })
  async login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ipAddress: string,
  ): Promise<AuthResponseDto> {
    return this.authService.loginWithPassword(dto, userAgent, ipAddress);
  }

  /**
   * POST /api/v1/auth/refresh
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new token pair' })
  @ApiResponse({
    status: 200,
    description: 'Tokens rotated successfully',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid token format' })
  @ApiUnauthorizedResponse({ description: 'Invalid, expired, or reused refresh token' })
  @ApiTooManyRequestsResponse({ description: 'Refresh rate limit exceeded (max 10 requests/min)' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Ip() ipAddress: string,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(dto.refreshToken, ipAddress);
  }

  /**
   * POST /api/v1/auth/forgot-password
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset link via email' })
  @ApiResponse({
    status: 200,
    description: 'Generic success response returned regardless of email existence',
    schema: {
      example: {
        message:
          'If an eligible account is associated with this email, a password reset link has been sent.',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid email format' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Ip() ipAddress: string,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto, ipAddress);
  }

  /**
   * POST /api/v1/auth/reset-password
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using single-use reset token from email' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully; all active sessions revoked',
    schema: {
      example: {
        message:
          'Password has been reset successfully. Please log in with your new password.',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid password format or token format' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired password reset token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Ip() ipAddress: string,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(dto, ipAddress);
  }

  // ─── Protected Endpoints ───────────────────────────────────────────────────

  /**
   * POST /api/v1/auth/change-password
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully; other active sessions revoked',
    schema: {
      example: {
        message:
          'Password updated successfully. Other active sessions have been logged out.',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'New password equals current password' })
  @ApiUnauthorizedResponse({ description: 'Current password is incorrect or missing JWT' })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
    @Ip() ipAddress: string,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(
      user.sub,
      user.sessionId,
      dto,
      ipAddress,
    );
  }

  /**
   * POST /api/v1/auth/logout
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from current device session' })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    schema: {
      example: { message: 'Logged out successfully' },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Ip() ipAddress: string,
  ): Promise<{ message: string }> {
    return this.authService.logout(user.sub, user.sessionId, ipAddress);
  }

  /**
   * POST /api/v1/auth/logout-all
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from all active device sessions across all devices' })
  @ApiResponse({
    status: 200,
    description: 'Logged out from all devices successfully',
    schema: {
      example: { message: 'Logged out from all devices successfully' },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  async logoutAll(
    @CurrentUser() user: JwtPayload,
    @Ip() ipAddress: string,
  ): Promise<{ message: string }> {
    return this.authService.logoutAllDevices(user.sub, ipAddress);
  }

  /**
   * GET /api/v1/auth/sessions
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all active device sessions for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of active user sessions',
    schema: {
      example: [
        {
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          deviceId: 'device-001',
          userAgent: 'Mozilla/5.0...',
          ipAddress: '127.0.0.1',
          createdAt: '2026-08-05T10:00:00.000Z',
          expiresAt: '2026-09-04T10:00:00.000Z',
          isCurrent: true,
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  async getSessions(
    @CurrentUser() user: JwtPayload,
  ): Promise<
    Array<{
      id: string;
      deviceId: string;
      userAgent: string | null;
      ipAddress: string | null;
      createdAt: Date;
      expiresAt: Date;
      isCurrent: boolean;
    }>
  > {
    return this.authService.getActiveSessions(user.sub, user.sessionId);
  }

  /**
   * DELETE /api/v1/auth/sessions/:sessionId
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a specific active device session by ID' })
  @ApiResponse({
    status: 200,
    description: 'Session revoked successfully',
    schema: {
      example: { message: 'Session revoked successfully' },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiNotFoundResponse({ description: 'Session not found or belongs to another user' })
  async revokeSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: JwtPayload,
    @Ip() ipAddress: string,
  ): Promise<{ message: string }> {
    return this.authService.revokeSession(user.sub, sessionId, ipAddress);
  }
}
