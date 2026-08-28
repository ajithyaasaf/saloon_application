import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
} from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { NotificationService as TransportNotificationService } from '../../../shared/notification/notification.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';

import { NotificationDeliveryEntity } from '../entities/notification-delivery.entity';
import { NotificationTemplateEntity } from '../entities/notification-template.entity';
import { NotificationEntity } from '../entities/notification.entity';
import { UserNotificationPreferenceEntity } from '../entities/user-notification-preference.entity';

import { NotificationDeliveryRepository } from '../repositories/notification-delivery.repository';
import { NotificationTemplateRepository } from '../repositories/notification-template.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { UserNotificationPreferenceRepository } from '../repositories/user-notification-preference.repository';

import { NotificationDispatchService } from '../services/notification-dispatch.service';
import { NotificationInboxService } from '../services/notification-inbox.service';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { NotificationTemplateService } from '../services/notification-template.service';

describe('Notifications Domain E2E Integration & Security Hardening Tests', () => {
  let templateService: NotificationTemplateService;
  let preferenceService: NotificationPreferenceService;
  let dispatchService: NotificationDispatchService;
  let inboxService: NotificationInboxService;

  let mockTemplateRepo: any;
  let mockNotificationRepo: any;
  let mockDeliveryRepo: any;
  let mockPreferenceRepo: any;
  let mockTransportService: any;
  let mockAuditService: any;
  let mockCacheService: any;
  let mockEventBus: any;
  let mockTransactionService: any;

  // In-memory stateful stores for full lifecycle simulation
  let templatesStore: Map<string, any>;
  let notificationsStore: Map<string, any>;
  let deliveriesStore: Map<string, any>;
  let preferencesStore: Map<string, any>; // key: `${userId}:${channel}`
  let cacheStore: Map<string, any>;
  let auditLogsStore: any[];
  let publishedEventsStore: any[];
  let transportQueueStore: any[];

  beforeEach(async () => {
    templatesStore = new Map();
    notificationsStore = new Map();
    deliveriesStore = new Map();
    preferencesStore = new Map();
    cacheStore = new Map();
    auditLogsStore = [];
    publishedEventsStore = [];
    transportQueueStore = [];

    // Mock Template Repository
    mockTemplateRepo = {
      findById: jest.fn().mockImplementation(async (id: string, salonId?: string | null) => {
        const item = templatesStore.get(id);
        if (!item || item.deletedAt) return null;
        if (salonId && item.salonId && item.salonId !== salonId) return null;
        return item;
      }),
      findByCodeAndChannel: jest.fn().mockImplementation(async (code: string, channel: NotificationChannel, salonId?: string | null) => {
        const items = Array.from(templatesStore.values()).filter(
          (t) => t.templateCode === code && t.channel === channel && !t.deletedAt,
        );
        // Prefer salon-specific over platform-wide
        const salonSpecific = items.find((t) => t.salonId === salonId);
        if (salonSpecific) return salonSpecific;
        const globalFallback = items.find((t) => t.salonId === null);
        return globalFallback || null;
      }),
      checkCodeExists: jest.fn().mockImplementation(async (code: string, salonId?: string, excludeId?: string) => {
        return Array.from(templatesStore.values()).some(
          (t) =>
            t.templateCode === code &&
            (t.salonId ?? null) === (salonId ?? null) &&
            t.id !== excludeId &&
            !t.deletedAt,
        );
      }),
      create: jest.fn().mockImplementation(async (data: any) => {
        const id = `tmpl-${templatesStore.size + 1}`;
        const record = {
          id,
          salonId: data.salonId ?? null,
          templateCode: data.templateCode,
          channel: data.channel,
          category: data.category,
          description: data.description ?? null,
          subjectTemplate: data.subjectTemplate ?? null,
          bodyTemplate: data.bodyTemplate,
          variables: data.variables ?? null,
          isActive: data.isActive ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
        templatesStore.set(id, record);
        return record;
      }),
      update: jest.fn().mockImplementation(async (id: string, data: any, salonId?: string | null) => {
        const existing = templatesStore.get(id);
        if (!existing || existing.deletedAt) return null;
        if (salonId && existing.salonId && existing.salonId !== salonId) return null;
        const updated = { ...existing, ...data, updatedAt: new Date() };
        templatesStore.set(id, updated);
        return updated;
      }),
      activate: jest.fn().mockImplementation(async (id: string, salonId?: string | null) => {
        const existing = templatesStore.get(id);
        if (!existing) return null;
        existing.isActive = true;
        return existing;
      }),
      deactivate: jest.fn().mockImplementation(async (id: string, salonId?: string | null) => {
        const existing = templatesStore.get(id);
        if (!existing) return null;
        existing.isActive = false;
        return existing;
      }),
      softDelete: jest.fn().mockImplementation(async (id: string, salonId?: string | null) => {
        const existing = templatesStore.get(id);
        if (!existing) return null;
        existing.deletedAt = new Date();
        return existing;
      }),
      search: jest.fn().mockImplementation(async (query: any) => {
        let items = Array.from(templatesStore.values()).filter((t) => !t.deletedAt);
        if (query.salonId !== undefined) {
          items = items.filter((t) => t.salonId === query.salonId || t.salonId === null);
        }
        if (query.channel) items = items.filter((t) => t.channel === query.channel);
        if (query.category) items = items.filter((t) => t.category === query.category);
        return { data: items, total: items.length };
      }),
    };

    // Mock Notification Repository
    mockNotificationRepo = {
      findById: jest.fn().mockImplementation(async (id: string) => {
        const notif = notificationsStore.get(id);
        if (!notif || notif.deletedAt) return null;
        const deliveries = Array.from(deliveriesStore.values()).filter((d) => d.notificationId === id);
        return { ...notif, deliveries };
      }),
      findByIdempotencyKey: jest.fn().mockImplementation(async (key: string) => {
        const notif = Array.from(notificationsStore.values()).find(
          (n) => n.idempotencyKey === key && !n.deletedAt,
        );
        if (!notif) return null;
        const deliveries = Array.from(deliveriesStore.values()).filter((d) => d.notificationId === notif.id);
        return { ...notif, deliveries };
      }),
      findByUserAndId: jest.fn().mockImplementation(async (userId: string, id: string) => {
        const notif = notificationsStore.get(id);
        if (!notif || notif.userId !== userId || notif.deletedAt) return null;
        return notif;
      }),
      create: jest.fn().mockImplementation(async (data: any) => {
        const id = `notif-${notificationsStore.size + 1}`;
        const record = {
          id,
          salonId: data.salonId ?? null,
          userId: data.userId,
          templateId: data.templateId ?? null,
          channel: data.channel,
          priority: data.priority,
          category: data.category,
          title: data.title,
          body: data.body,
          idempotencyKey: data.idempotencyKey ?? null,
          metadata: data.metadata ?? null,
          scheduledAt: data.scheduledAt ?? null,
          readAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
        notificationsStore.set(id, record);
        return record;
      }),
      markRead: jest.fn().mockImplementation(async (id: string, userId: string) => {
        const notif = notificationsStore.get(id);
        if (!notif || notif.userId !== userId || notif.deletedAt) return null;
        notif.readAt = new Date();
        return notif;
      }),
      markUnread: jest.fn().mockImplementation(async (id: string, userId: string) => {
        const notif = notificationsStore.get(id);
        if (!notif || notif.userId !== userId || notif.deletedAt) return null;
        notif.readAt = null;
        return notif;
      }),
      markAllRead: jest.fn().mockImplementation(async (userId: string) => {
        let count = 0;
        for (const notif of notificationsStore.values()) {
          if (notif.userId === userId && !notif.readAt && !notif.deletedAt) {
            notif.readAt = new Date();
            count++;
          }
        }
        return count;
      }),
      softDelete: jest.fn().mockImplementation(async (id: string, userId: string) => {
        const notif = notificationsStore.get(id);
        if (!notif || notif.userId !== userId) return null;
        notif.deletedAt = new Date();
        return notif;
      }),
      countUnread: jest.fn().mockImplementation(async (userId: string) => {
        return Array.from(notificationsStore.values()).filter(
          (n) => n.userId === userId && !n.readAt && !n.deletedAt,
        ).length;
      }),
      search: jest.fn().mockImplementation(async (query: any) => {
        let items = Array.from(notificationsStore.values()).filter((n) => !n.deletedAt);
        if (query.userId) items = items.filter((n) => n.userId === query.userId);
        if (query.salonId) items = items.filter((n) => n.salonId === query.salonId);
        if (query.isRead !== undefined) {
          items = items.filter((n) => (query.isRead ? !!n.readAt : !n.readAt));
        }
        return { data: items, total: items.length };
      }),
    };

    // Mock Delivery Repository
    mockDeliveryRepo = {
      create: jest.fn().mockImplementation(async (data: any) => {
        const id = `del-${deliveriesStore.size + 1}`;
        const record = {
          id,
          notificationId: data.notificationId,
          channel: data.channel,
          status: data.status,
          providerMessageId: data.providerMessageId ?? null,
          sentAt: data.sentAt ?? null,
          deliveredAt: data.deliveredAt ?? null,
          failedReason: null,
          retryCount: 0,
          nextRetryAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        deliveriesStore.set(id, record);
        return record;
      }),
      markSent: jest.fn().mockImplementation(async (id: string, providerMsgId?: string) => {
        const del = deliveriesStore.get(id);
        if (del) {
          del.status = NotificationStatus.SENT;
          del.sentAt = new Date();
          if (providerMsgId) del.providerMessageId = providerMsgId;
        }
        return del;
      }),
      markDelivered: jest.fn().mockImplementation(async (id: string) => {
        const del = deliveriesStore.get(id);
        if (del) {
          del.status = NotificationStatus.DELIVERED;
          del.deliveredAt = new Date();
        }
        return del;
      }),
      markFailed: jest.fn().mockImplementation(async (id: string, reason: string) => {
        const del = deliveriesStore.get(id);
        if (del) {
          del.status = NotificationStatus.FAILED;
          del.failedReason = reason;
        }
        return del;
      }),
      scheduleRetry: jest.fn().mockImplementation(async (id: string, nextRetryAt: Date, increment = false) => {
        const del = deliveriesStore.get(id);
        if (del) {
          del.status = NotificationStatus.FAILED;
          del.nextRetryAt = nextRetryAt;
          if (increment) del.retryCount += 1;
        }
        return del;
      }),
      findPendingRetries: jest.fn().mockImplementation(async () => {
        return Array.from(deliveriesStore.values()).filter(
          (d) => d.status === NotificationStatus.FAILED && d.retryCount < 3,
        );
      }),
    };

    // Mock Preference Repository
    mockPreferenceRepo = {
      findByUser: jest.fn().mockImplementation(async (userId: string) => {
        return Array.from(preferencesStore.values()).filter((p) => p.userId === userId);
      }),
      findByUserAndChannel: jest.fn().mockImplementation(async (userId: string, channel: NotificationChannel) => {
        return preferencesStore.get(`${userId}:${channel}`) || null;
      }),
      upsert: jest.fn().mockImplementation(async (data: any) => {
        const key = `${data.userId}:${data.channel}`;
        const existing = preferencesStore.get(key) || {
          id: `pref-${preferencesStore.size + 1}`,
          userId: data.userId,
          channel: data.channel,
          createdAt: new Date(),
        };
        const updated = {
          ...existing,
          ...data,
          updatedAt: new Date(),
        };
        preferencesStore.set(key, updated);
        return updated;
      }),
    };

    // Mock Transport Service
    mockTransportService = {
      send: jest.fn().mockImplementation(async (dto: any) => {
        transportQueueStore.push(dto);
        return { jobId: `JOB-${transportQueueStore.length}`, status: 'QUEUED' };
      }),
    };

    // Mock Transaction Service
    mockTransactionService = {
      run: jest.fn().mockImplementation(async (cb: () => Promise<any>) => cb()),
    };

    // Mock Audit, Cache, EventBus
    mockAuditService = {
      log: jest.fn().mockImplementation(async (entry: any) => {
        auditLogsStore.push(entry);
      }),
    };

    mockCacheService = {
      get: jest.fn().mockImplementation(async (k: string) => cacheStore.get(k) ?? null),
      set: jest.fn().mockImplementation(async (k: string, v: any) => {
        cacheStore.set(k, v);
      }),
      delete: jest.fn().mockImplementation(async (k: string) => {
        cacheStore.delete(k);
      }),
      deleteByPattern: jest.fn().mockImplementation(async () => {
        cacheStore.clear();
      }),
    };

    mockEventBus = {
      publish: jest.fn().mockImplementation(async (event: any) => {
        publishedEventsStore.push(event);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTemplateService,
        NotificationPreferenceService,
        NotificationDispatchService,
        NotificationInboxService,
        { provide: NotificationTemplateRepository, useValue: mockTemplateRepo },
        { provide: NotificationRepository, useValue: mockNotificationRepo },
        { provide: NotificationDeliveryRepository, useValue: mockDeliveryRepo },
        { provide: UserNotificationPreferenceRepository, useValue: mockPreferenceRepo },
        { provide: TransportNotificationService, useValue: mockTransportService },
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    templateService = module.get<NotificationTemplateService>(NotificationTemplateService);
    preferenceService = module.get<NotificationPreferenceService>(NotificationPreferenceService);
    dispatchService = module.get<NotificationDispatchService>(NotificationDispatchService);
    inboxService = module.get<NotificationInboxService>(NotificationInboxService);
  });

  // ─── 1. Template Lifecycle & Variable Interpolation ─────────────────────────

  describe('1. Template Lifecycle & Variable Interpolation', () => {
    it('should create platform-wide template and interpolate variables safely', async () => {
      const template = await templateService.createTemplate(
        {
          salonId: null,
          templateCode: 'APPOINTMENT_CONFIRMATION',
          channel: NotificationChannel.SMS,
          category: NotificationCategory.BOOKING,
          subjectTemplate: 'Booking at {{salonName}}',
          bodyTemplate: 'Hi {{customerName}}, your booking for {{serviceName}} is confirmed for {{time}}.',
        },
        'admin-1',
      );

      expect(template.isPlatformWide()).toBe(true);
      expect(template.extractRequiredVariables()).toEqual(
        expect.arrayContaining(['salonName', 'customerName', 'serviceName', 'time']),
      );

      const rendered = await templateService.renderTemplate(template.id, {
        salonName: 'Luxe Salon',
        customerName: 'Sarah',
        serviceName: 'Hair Styling',
        time: '2:30 PM',
      });

      expect(rendered.subject).toBe('Booking at Luxe Salon');
      expect(rendered.body).toBe('Hi Sarah, your booking for Hair Styling is confirmed for 2:30 PM.');
    });

    it('should reject variable rendering when required placeholders are missing', async () => {
      const template = await templateService.createTemplate(
        {
          templateCode: 'OTP_VERIFY',
          channel: NotificationChannel.SMS,
          category: NotificationCategory.SYSTEM,
          bodyTemplate: 'Your OTP is {{otpCode}}. Valid for {{expiresIn}} minutes.',
        },
        'admin-1',
      );

      await expect(
        templateService.renderTemplate(template.id, { otpCode: '123456' }), // Missing expiresIn
      ).rejects.toThrow(BadRequestException);
    });

    it('should render preview with fallback placeholders for unprovided variables', async () => {
      const template = await templateService.createTemplate(
        {
          templateCode: 'PROMO_DISCOUNT',
          channel: NotificationChannel.PUSH,
          category: NotificationCategory.MARKETING,
          bodyTemplate: 'Special {{discount}}% off on {{serviceName}} today only!',
        },
        'admin-1',
      );

      const preview = await templateService.previewTemplate(template.id, { discount: 20 });
      expect(preview.body).toBe('Special 20% off on [serviceName] today only!');
    });
  });

  // ─── 2. Template Resolution & Fallback ──────────────────────────────────────

  describe('2. Template Resolution & Fallback', () => {
    it('should resolve salon-specific override when available, and fall back to platform default', async () => {
      // 1. Create platform default
      await templateService.createTemplate(
        {
          salonId: null,
          templateCode: 'REMINDER_NOTICE',
          channel: NotificationChannel.SMS,
          category: NotificationCategory.REMINDERS,
          bodyTemplate: 'Default Platform Reminder: {{time}}',
        },
        'admin-1',
      );

      // 2. Resolve for salon-1 (no override yet -> resolves platform default)
      const resolvedDefault = await templateService.resolveTemplate(
        'REMINDER_NOTICE',
        NotificationChannel.SMS,
        'salon-1',
      );
      expect(resolvedDefault.bodyTemplate).toBe('Default Platform Reminder: {{time}}');

      // 3. Create salon-specific override
      await templateService.createTemplate(
        {
          salonId: 'salon-1',
          templateCode: 'REMINDER_NOTICE',
          channel: NotificationChannel.SMS,
          category: NotificationCategory.REMINDERS,
          bodyTemplate: 'Luxe Salon Exclusive Reminder: {{time}}',
        },
        'owner-1',
      );

      // 4. Resolve again for salon-1 -> resolves salon override
      const resolvedOverride = await templateService.resolveTemplate(
        'REMINDER_NOTICE',
        NotificationChannel.SMS,
        'salon-1',
      );
      expect(resolvedOverride.bodyTemplate).toBe('Luxe Salon Exclusive Reminder: {{time}}');

      // 5. Another salon-2 still receives platform default
      const resolvedSalon2 = await templateService.resolveTemplate(
        'REMINDER_NOTICE',
        NotificationChannel.SMS,
        'salon-2',
      );
      expect(resolvedSalon2.bodyTemplate).toBe('Default Platform Reminder: {{time}}');
    });
  });

  // ─── 3. Multi-Channel Notification Dispatch ─────────────────────────────────

  describe('3. Multi-Channel Notification Dispatch', () => {
    it('should dispatch single notification across multiple channels with isolated delivery tracking', async () => {
      const notif = await dispatchService.dispatch({
        userId: 'user-100',
        salonId: 'salon-1',
        title: 'Booking Confirmed',
        body: 'Your appointment is booked for 10:00 AM.',
        channels: [
          NotificationChannel.IN_APP,
          NotificationChannel.SMS,
          NotificationChannel.EMAIL,
          NotificationChannel.PUSH,
        ],
        priority: NotificationPriority.HIGH,
        category: NotificationCategory.BOOKING,
      });

      expect(notif.id).toBeDefined();
      expect(notif.deliveries).toHaveLength(4);

      // IN_APP is immediately marked DELIVERED into database
      const inAppDelivery = notif.deliveries?.find((d) => d.channel === NotificationChannel.IN_APP);
      expect(inAppDelivery?.status).toBe(NotificationStatus.DELIVERED);

      // External transports queued and marked SENT in delivery store
      const externalChannels = [NotificationChannel.SMS, NotificationChannel.EMAIL, NotificationChannel.PUSH];
      for (const ch of externalChannels) {
        const del = notif.deliveries?.find((d) => d.channel === ch);
        const updatedDelivery = deliveriesStore.get(del!.id);
        expect(updatedDelivery?.status).toBe(NotificationStatus.SENT);
      }

      expect(transportQueueStore).toHaveLength(3);
    });
  });

  // ─── 4. User Preference & Channel Opt-Out ───────────────────────────────────

  describe('4. User Preference & Channel Opt-Out', () => {
    it('should suppress disabled channels while dispatching allowed channels', async () => {
      // User opts out of SMS
      await preferenceService.disableChannel('user-100', NotificationChannel.SMS);

      const notif = await dispatchService.dispatch({
        userId: 'user-100',
        title: 'Discount Alert',
        body: 'Special offer today!',
        channels: [NotificationChannel.SMS, NotificationChannel.PUSH, NotificationChannel.IN_APP],
      });

      // SMS was suppressed, only PUSH & IN_APP deliveries created
      expect(notif.deliveries).toHaveLength(2);
      expect(notif.deliveries?.some((d) => d.channel === NotificationChannel.SMS)).toBe(false);
      expect(notif.deliveries?.some((d) => d.channel === NotificationChannel.PUSH)).toBe(true);
      expect(notif.deliveries?.some((d) => d.channel === NotificationChannel.IN_APP)).toBe(true);
    });
  });

  // ─── 5. Quiet Hours & Midnight-Crossing Support ─────────────────────────────

  describe('5. Quiet Hours & Midnight-Crossing Support', () => {
    it('should suppress notifications during configured midnight-crossing quiet period', async () => {
      // Set quiet hours 22:00 -> 08:00
      await preferenceService.setQuietHours(
        'user-100',
        NotificationChannel.PUSH,
        '22:00:00',
        '08:00:00',
      );

      // 1. Time at 23:30 UTC -> inside quiet hours -> suppressed
      const nightTime = new Date('2026-06-15T23:30:00Z');
      const nightCheck = await preferenceService.canDeliver(
        'user-100',
        NotificationChannel.PUSH,
        NotificationPriority.NORMAL,
        nightTime,
      );
      expect(nightCheck.allowed).toBe(false);

      // 2. Time at 04:00 UTC -> inside quiet hours -> suppressed
      const earlyMorning = new Date('2026-06-15T04:00:00Z');
      const earlyCheck = await preferenceService.canDeliver(
        'user-100',
        NotificationChannel.PUSH,
        NotificationPriority.NORMAL,
        earlyMorning,
      );
      expect(earlyCheck.allowed).toBe(false);

      // 3. Time at 14:00 UTC -> outside quiet hours -> allowed
      const dayTime = new Date('2026-06-15T14:00:00Z');
      const dayCheck = await preferenceService.canDeliver(
        'user-100',
        NotificationChannel.PUSH,
        NotificationPriority.NORMAL,
        dayTime,
      );
      expect(dayCheck.allowed).toBe(true);
    });
  });

  // ─── 6. CRITICAL Priority Bypass ────────────────────────────────────────────

  describe('6. CRITICAL Priority Bypass', () => {
    it('should bypass quiet hours when notification priority is CRITICAL', async () => {
      await preferenceService.setQuietHours(
        'user-100',
        NotificationChannel.SMS,
        '22:00:00',
        '08:00:00',
      );

      const midnight = new Date('2026-06-15T00:30:00Z');

      // NORMAL is blocked
      const normalCheck = await preferenceService.canDeliver(
        'user-100',
        NotificationChannel.SMS,
        NotificationPriority.NORMAL,
        midnight,
      );
      expect(normalCheck.allowed).toBe(false);

      // CRITICAL bypasses quiet hours
      const criticalCheck = await preferenceService.canDeliver(
        'user-100',
        NotificationChannel.SMS,
        NotificationPriority.CRITICAL,
        midnight,
      );
      expect(criticalCheck.allowed).toBe(true);
    });
  });

  // ─── 7. Idempotency & Duplicate Prevention ──────────────────────────────────

  describe('7. Idempotency & Duplicate Prevention', () => {
    it('should return existing notification on duplicate idempotency key without re-dispatching', async () => {
      const idempotencyKey = 'booking-confirm:unique-999';

      const firstDispatch = await dispatchService.dispatch({
        userId: 'user-100',
        title: 'Booking Confirmed',
        body: 'Your slot is secured.',
        idempotencyKey,
        channels: [NotificationChannel.SMS],
      });

      expect(firstDispatch.id).toBeDefined();
      expect(transportQueueStore).toHaveLength(1);

      // Second dispatch with same idempotency key
      const secondDispatch = await dispatchService.dispatch({
        userId: 'user-100',
        title: 'Booking Confirmed',
        body: 'Your slot is secured.',
        idempotencyKey,
        channels: [NotificationChannel.SMS],
      });

      expect(secondDispatch.id).toBe(firstDispatch.id);
      // No extra job queued to transport
      expect(transportQueueStore).toHaveLength(1);
    });
  });

  // ─── 8. Delivery Tracking, Failure & Retries ─────────────────────────────────

  describe('8. Delivery Tracking, Failure & Retries', () => {
    it('should record failure, schedule exponential retry, and process retries up to maximum 3 attempts', async () => {
      mockTransportService.send.mockRejectedValueOnce(new Error('SMS Gateway Down'));

      const notif = await dispatchService.dispatch({
        userId: 'user-100',
        title: 'Payment Receipt',
        body: 'Your payment was received.',
        channels: [NotificationChannel.SMS],
      });

      const delivery = deliveriesStore.get(notif.deliveries![0].id);
      expect(delivery.status).toBe(NotificationStatus.FAILED);
      expect(delivery.failedReason).toBe('SMS Gateway Down');
      expect(delivery.nextRetryAt).toBeDefined();

      // Successful retry processing
      mockTransportService.send.mockResolvedValueOnce({ jobId: 'JOB-RETRY-1', status: 'SENT' });
      const processedCount = await dispatchService.processRetries(10);

      expect(processedCount).toBe(1);
      expect(delivery.status).toBe(NotificationStatus.SENT);
      expect(delivery.providerMessageId).toBe('JOB-RETRY-1');
    });
  });

  // ─── 9. Customer Notification Inbox Lifecycle ───────────────────────────────

  describe('9. Customer Notification Inbox Lifecycle', () => {
    it('should manage complete inbox lifecycle: list, mark read, unread count, soft delete', async () => {
      // 1. Create 3 notifications for user-100
      await dispatchService.dispatch({ userId: 'user-100', title: 'Notif 1', body: 'Msg 1', channels: [NotificationChannel.IN_APP] });
      await dispatchService.dispatch({ userId: 'user-100', title: 'Notif 2', body: 'Msg 2', channels: [NotificationChannel.IN_APP] });
      const notif3 = await dispatchService.dispatch({ userId: 'user-100', title: 'Notif 3', body: 'Msg 3', channels: [NotificationChannel.IN_APP] });

      // 2. Unread count is 3
      let unreadCount = await inboxService.getUnreadCount('user-100');
      expect(unreadCount).toBe(3);

      // 3. Mark notif3 read
      await inboxService.markAsRead(notif3.id, 'user-100');
      unreadCount = await inboxService.getUnreadCount('user-100');
      expect(unreadCount).toBe(2);

      // 4. Mark all read
      await inboxService.markAllAsRead('user-100');
      unreadCount = await inboxService.getUnreadCount('user-100');
      expect(unreadCount).toBe(0);

      // 5. Soft delete notif3
      await inboxService.deleteNotification(notif3.id, 'user-100');
      const inbox = await inboxService.getInbox('user-100');
      expect(inbox.total).toBe(2); // Deleted notification omitted from inbox
    });
  });

  // ─── 10. Multi-Tenant Isolation & Customer IDOR Protection ──────────────────

  describe('10. Multi-Tenant Isolation & Customer IDOR Protection', () => {
    it('should reject cross-tenant template modification', async () => {
      const template = await templateService.createTemplate(
        {
          salonId: 'salon-A',
          templateCode: 'EXCLUSIVE_OFFER',
          channel: NotificationChannel.PUSH,
          category: NotificationCategory.MARKETING,
          bodyTemplate: 'Exclusive Salon A Offer',
        },
        'owner-A',
      );

      // Owner of Salon B attempts to modify Salon A's template
      await expect(
        templateService.updateTemplate(template.id, { bodyTemplate: 'Hacked' }, 'salon-B', 'owner-B'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce customer IDOR protection on inbox notifications', async () => {
      const userANotif = await dispatchService.dispatch({
        userId: 'user-A',
        title: 'Private Notice',
        body: 'Sensitive User A Information',
        channels: [NotificationChannel.IN_APP],
      });

      // User B attempts to access User A's notification
      await expect(
        inboxService.getNotificationById(userANotif.id, 'user-B'),
      ).rejects.toThrow(NotFoundException);

      // User B attempts to mark User A's notification as read
      await expect(
        inboxService.markAsRead(userANotif.id, 'user-B'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
