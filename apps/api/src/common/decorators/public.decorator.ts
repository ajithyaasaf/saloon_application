import { SetMetadata } from '@nestjs/common';

/**
 * Public metadata key checked by JwtAuthGuard.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() — marks a route as publicly accessible (no JWT required).
 *
 * JwtAuthGuard checks for this metadata and skips token validation
 * when present.
 *
 * Usage:
 *   @Public()
 *   @Post('auth/otp/request')
 *   requestOtp(@Body() dto: RequestOtpDto) { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
