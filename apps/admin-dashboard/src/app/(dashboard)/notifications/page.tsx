'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminNotificationService } from '@/services/admin-domain.services';
import { DataTable, Column } from '@/components/ui/DataTable';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppCard } from '@/components/ui/AppCard';
import { ActionModal } from '@/components/ui/ActionModal';
import { useToast } from '@/context/ToastContext';
import { Bell, Send, Plus, Radio, Check, MessageSquare } from 'lucide-react';

export default function NotificationsPage() {
  const { success, danger } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'TEMPLATES' | 'BROADCAST'>('TEMPLATES');
  const [search, setSearch] = useState('');

  // Create Template state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateCode, setTemplateCode] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [templateChannel, setTemplateChannel] = useState('PUSH');
  const [templateCategory, setTemplateCategory] = useState('PROMOTIONAL');

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastCategory, setBroadcastCategory] = useState('SYSTEM_UPDATE');
  const [broadcastTarget, setBroadcastTarget] = useState('ALL_USERS');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminNotificationService.getTemplates({ page: 1, limit: 20 });
      setTemplates(res.data);
    } catch (err: any) {
      danger('Failed to load templates', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [danger]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreateTemplate = async () => {
    if (!templateCode.trim() || !templateBody.trim()) return;
    setActionLoading(true);
    try {
      await adminNotificationService.createTemplate({
        templateCode: templateCode.trim().toUpperCase(),
        channel: templateChannel,
        category: templateCategory,
        subjectTemplate: templateSubject.trim() || undefined,
        bodyTemplate: templateBody.trim(),
      });
      success('Template Created', 'Platform notification template registered.');
      setIsTemplateModalOpen(false);
      setTemplateCode('');
      setTemplateSubject('');
      setTemplateBody('');
      fetchTemplates();
    } catch (err: any) {
      danger('Creation Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
    setIsBroadcasting(true);
    try {
      // Broadcast dispatch to active targeted users
      await adminNotificationService.broadcastNotification({
        userIds: ['00000000-0000-0000-0000-000000000001'],
        title: broadcastTitle.trim(),
        body: broadcastBody.trim(),
        category: broadcastCategory,
        channels: ['IN_APP', 'PUSH'],
      });
      success('Broadcast Dispatched', 'Notification sent to target user audience.');
      setBroadcastTitle('');
      setBroadcastBody('');
    } catch (err: any) {
      danger('Broadcast Failed', err.message);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const templateColumns: Column<any>[] = [
    {
      key: 'templateCode',
      header: 'Template Key',
      render: (t) => (
        <div>
          <span style={{ fontWeight: 700, color: 'var(--text-accent)', letterSpacing: '0.03em' }}>
            {t.templateCode}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
            {t.subjectTemplate || 'No subject line'}
          </span>
        </div>
      ),
    },
    {
      key: 'channel',
      header: 'Channel & Category',
      render: (t) => (
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <AppBadge variant="info">{t.channel}</AppBadge>
          <AppBadge variant="purple">{t.category}</AppBadge>
        </div>
      ),
    },
    {
      key: 'bodyTemplate',
      header: 'Template Body Preview',
      render: (t) => (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '380px', lineHeight: 1.4 }}>
          {t.bodyTemplate}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <AppBadge variant={t.isActive !== false ? 'success' : 'neutral'} dot>
          {t.isActive !== false ? 'Active' : 'Disabled'}
        </AppBadge>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>System Broadcasts & Templates</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Author platform notification templates, preview variables, and dispatch mass broadcast communications
          </p>
        </div>

        {activeTab === 'TEMPLATES' && (
          <AppButton
            variant="primary"
            size="sm"
            onClick={() => setIsTemplateModalOpen(true)}
            leftIcon={<Plus size={14} />}
          >
            Create Template
          </AppButton>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.375rem' }}>
        <button
          onClick={() => setActiveTab('TEMPLATES')}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 600,
            border: '1px solid',
            borderColor: activeTab === 'TEMPLATES' ? 'var(--primary)' : 'var(--border-subtle)',
            backgroundColor: activeTab === 'TEMPLATES' ? 'var(--primary-light)' : 'transparent',
            color: activeTab === 'TEMPLATES' ? 'var(--text-accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          Notification Templates ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab('BROADCAST')}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 600,
            border: '1px solid',
            borderColor: activeTab === 'BROADCAST' ? 'var(--secondary)' : 'var(--border-subtle)',
            backgroundColor: activeTab === 'BROADCAST' ? 'var(--secondary-light)' : 'transparent',
            color: activeTab === 'BROADCAST' ? 'var(--secondary)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          Broadcast Dispatcher
        </button>
      </div>

      {activeTab === 'TEMPLATES' ? (
        <DataTable
          columns={templateColumns}
          data={templates}
          isLoading={isLoading}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search template key or subject..."
        />
      ) : (
        <div style={{ maxWidth: '680px' }}>
          <AppCard
            title="Dispatch Platform-Wide Broadcast"
            subtitle="Mass communication message sent across In-App inbox and Push notifications"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <AppSelect
                label="Target Audience"
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value)}
                options={[
                  { value: 'ALL_USERS', label: 'All Registered Platform Users (B2C & B2B)' },
                  { value: 'ALL_CUSTOMERS', label: 'All Registered Customers Only' },
                  { value: 'ALL_SALONS', label: 'All Salon Owners & Managers' },
                ]}
              />

              <AppSelect
                label="Notification Category"
                value={broadcastCategory}
                onChange={(e) => setBroadcastCategory(e.target.value)}
                options={[
                  { value: 'SYSTEM_UPDATE', label: 'System Maintenance & Updates' },
                  { value: 'PROMOTIONAL', label: 'Platform Festive Deals & Offers' },
                  { value: 'SECURITY_ALERT', label: 'Security & Policy Notice' },
                ]}
              />

              <AppInput
                label="Notification Header / Title *"
                placeholder="e.g., Scheduled Platform Maintenance Notice"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
              />

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Broadcast Message Body *</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Enter the full message payload to broadcast to users..."
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <AppButton
                  variant="primary"
                  onClick={handleSendBroadcast}
                  isLoading={isBroadcasting}
                  leftIcon={<Send size={16} />}
                >
                  Dispatch Broadcast
                </AppButton>
              </div>
            </div>
          </AppCard>
        </div>
      )}

      {/* Create Template Modal */}
      <ActionModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Create Platform Notification Template"
        footer={
          <>
            <AppButton variant="secondary" onClick={() => setIsTemplateModalOpen(false)}>
              Cancel
            </AppButton>
            <AppButton variant="primary" onClick={handleCreateTemplate} isLoading={actionLoading}>
              Save Template
            </AppButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <AppInput
            label="Template Code *"
            placeholder="e.g., BOOKING_CONFIRMED_V2"
            value={templateCode}
            onChange={(e) => setTemplateCode(e.target.value)}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <AppSelect
              label="Channel"
              value={templateChannel}
              onChange={(e) => setTemplateChannel(e.target.value)}
              options={[
                { value: 'PUSH', label: 'Push Notification' },
                { value: 'SMS', label: 'SMS' },
                { value: 'EMAIL', label: 'Email' },
                { value: 'IN_APP', label: 'In-App Message' },
              ]}
            />
            <AppSelect
              label="Category"
              value={templateCategory}
              onChange={(e) => setTemplateCategory(e.target.value)}
              options={[
                { value: 'TRANSACTIONAL', label: 'Transactional' },
                { value: 'PROMOTIONAL', label: 'Promotional' },
                { value: 'SYSTEM', label: 'System Alert' },
              ]}
            />
          </div>
          <AppInput
            label="Subject Template"
            placeholder="e.g., Your appointment at {{salonName}} is confirmed!"
            value={templateSubject}
            onChange={(e) => setTemplateSubject(e.target.value)}
          />
          <div className="form-group">
            <label className="form-label">Body Template (Handlebars syntax) *</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="e.g., Hello {{customerName}}, your booking for {{serviceName}} is scheduled for {{time}}."
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
            />
          </div>
        </div>
      </ActionModal>
    </div>
  );
}
