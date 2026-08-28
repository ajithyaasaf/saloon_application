import { Injectable, Logger } from '@nestjs/common';
import { ConsentChannel } from '@prisma/client';
import { CACHE_KEYS } from '../../../common/constants/cache-keys.constant';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { UpdateCustomerPreferenceDto } from '../dto/customer-preference.dto';
import { CustomerPreferenceEntity } from '../entities/customer-profile.entity';
import { StringUtil } from '../../../common/utils/string.util';
import { CustomerConsentHistoryRepository } from '../repositories/customer-consent-history.repository';
import { CustomerPreferenceRepository } from '../repositories/customer-preference.repository';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';

@Injectable()
export class CustomerPreferenceService {
  private readonly logger = new Logger(CustomerPreferenceService.name);

  constructor(
    private readonly customerRepo: CustomerProfileRepository,
    private readonly preferenceRepo: CustomerPreferenceRepository,
    private readonly consentRepo: CustomerConsentHistoryRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
  ) {}

  public async updatePreferences(
    customerProfileId: string,
    dto: UpdateCustomerPreferenceDto,
    actorUserId: string,
    clientIp?: string,
    userAgent?: string,
  ): Promise<CustomerPreferenceEntity> {
    const customer = await this.customerRepo.findById(customerProfileId);
    if (!customer) {
      throw new ResourceNotFoundException(ERROR_CODES.USER.NOT_FOUND, 'Customer profile not found');
    }

    let existingPref = await this.preferenceRepo.findByCustomer(customerProfileId);

    const updated = await this.transactionService.run(async (tx) => {
      if (!existingPref) {
        existingPref = await this.preferenceRepo.create(
          {
            customerProfileId,
            marketingEmail: dto.marketingEmail ?? true,
            marketingSms: dto.marketingSms ?? true,
            marketingWhatsapp: dto.marketingWhatsapp ?? true,
          },
          tx,
        );
      }

      if (dto.marketingEmail !== undefined && dto.marketingEmail !== existingPref.marketingEmail) {
        await this.consentRepo.create(customerProfileId, ConsentChannel.EMAIL, existingPref.marketingEmail, dto.marketingEmail, actorUserId, clientIp, userAgent, tx);
      }
      if (dto.marketingSms !== undefined && dto.marketingSms !== existingPref.marketingSms) {
        await this.consentRepo.create(customerProfileId, ConsentChannel.SMS, existingPref.marketingSms, dto.marketingSms, actorUserId, clientIp, userAgent, tx);
      }
      if (dto.marketingWhatsapp !== undefined && dto.marketingWhatsapp !== existingPref.marketingWhatsapp) {
        await this.consentRepo.create(customerProfileId, ConsentChannel.WHATSAPP, existingPref.marketingWhatsapp, dto.marketingWhatsapp, actorUserId, clientIp, userAgent, tx);
      }

      const sanitizedDto = {
        ...dto,
        ...(dto.patchTestNotes !== undefined ? { patchTestNotes: StringUtil.sanitizeText(dto.patchTestNotes, 1000) } : {}),
        ...(dto.beveragePreference !== undefined ? { beveragePreference: StringUtil.sanitizeText(dto.beveragePreference, 200) } : {}),
      };

      const pref = await this.preferenceRepo.update(customerProfileId, sanitizedDto, tx);

      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'UPDATE',
        entityType: 'CustomerPreference',
        entityId: pref.id,
        previousState: existingPref as any,
        newState: pref as any,
      });

      return pref;
    });

    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_PROFILE(customerProfileId));

    return new CustomerPreferenceEntity(updated);
  }

  public async recordConsent(
    customerProfileId: string,
    channel: ConsentChannel,
    previousValue: boolean,
    newValue: boolean,
    actorUserId: string,
    clientIp?: string,
    userAgent?: string,
  ) {
    return this.transactionService.run(async (tx) => {
      return this.consentRepo.create(customerProfileId, channel, previousValue, newValue, actorUserId, clientIp, userAgent, tx);
    });
  }
}
