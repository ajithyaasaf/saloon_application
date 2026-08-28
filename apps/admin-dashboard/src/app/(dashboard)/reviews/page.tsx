'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminReviewService } from '@/services/admin-domain.services';
import { DataTable, Column } from '@/components/ui/DataTable';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { ActionModal } from '@/components/ui/ActionModal';
import { AppInput } from '@/components/ui/AppInput';
import { AppSelect } from '@/components/ui/AppSelect';
import { useToast } from '@/context/ToastContext';
import { Star, ShieldAlert, Check, X, EyeOff, MessageSquare } from 'lucide-react';

export default function ReviewsPage() {
  const { success, danger } = useToast();
  const [reviews, setReviews] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MODERATION' | 'FLAGS' | 'DISPUTES'>('MODERATION');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(undefined);

  const [hidingReviewId, setHidingReviewId] = useState<string | null>(null);
  const [publishingReviewId, setPublishingReviewId] = useState<string | null>(null);
  const [resolvingFlag, setResolvingFlag] = useState<any | null>(null);
  const [resolvingDispute, setResolvingDispute] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState('RESOLVED');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReviewsData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'FLAGS') {
        const res = await adminReviewService.getFlags({ page, limit: 10 });
        setFlags(res.data);
        setMeta(res.meta);
      } else if (activeTab === 'DISPUTES') {
        const res = await adminReviewService.getDisputes({ page, limit: 10 });
        setDisputes(res.data);
        setMeta(res.meta);
      } else {
        const res = await adminReviewService.getModerationReviews({ page, limit: 10 });
        setReviews(res.data);
        setMeta(res.meta);
      }
    } catch (err: any) {
      danger('Failed to load review records', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, page, danger]);

  useEffect(() => {
    fetchReviewsData();
  }, [fetchReviewsData]);

  const handleHideReview = async (reason?: string) => {
    if (!hidingReviewId || !reason) return;
    setActionLoading(true);
    try {
      await adminReviewService.hideReview(hidingReviewId, reason);
      success('Review Hidden', 'Review suppressed from public salon catalog.');
      setHidingReviewId(null);
      fetchReviewsData();
    } catch (err: any) {
      danger('Hide Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishReview = async () => {
    if (!publishingReviewId) return;
    setActionLoading(true);
    try {
      await adminReviewService.publishReview(publishingReviewId);
      success('Review Published', 'Review is now visible to public users.');
      setPublishingReviewId(null);
      fetchReviewsData();
    } catch (err: any) {
      danger('Publish Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveFlag = async () => {
    if (!resolvingFlag || !resolutionNotes.trim()) return;
    setActionLoading(true);
    try {
      await adminReviewService.resolveFlag(
        resolvingFlag.id,
        resolutionStatus,
        resolutionNotes.trim()
      );
      success('Flag Report Resolved', 'Flag report status updated with moderator decision.');
      setResolvingFlag(null);
      setResolutionNotes('');
      fetchReviewsData();
    } catch (err: any) {
      danger('Resolution Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!resolvingDispute || !resolutionNotes.trim()) return;
    setActionLoading(true);
    try {
      await adminReviewService.resolveDispute(
        resolvingDispute.id,
        resolutionStatus,
        resolutionNotes.trim(),
        resolvingDispute.version ?? 1
      );
      success('Dispute Arbitrated', 'Dispute arbitration decision permanently recorded.');
      setResolvingDispute(null);
      setResolutionNotes('');
      fetchReviewsData();
    } catch (err: any) {
      danger('Arbitration Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const reviewColumns: Column<any>[] = [
    {
      key: 'rating',
      header: 'Rating & Feedback',
      render: (r) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-status-warning)' }}>
            <Star size={16} fill="currentColor" />
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
              {r.overallRating ?? 5}.0
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.4 }}>
            "{r.comment || 'No written comments'}"
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Moderation Status',
      render: (r) => (
        <AppBadge
          variant={
            r.status === 'PUBLISHED'
              ? 'success'
              : r.status === 'HIDDEN'
              ? 'warning'
              : r.status === 'REJECTED'
              ? 'danger'
              : 'neutral'
          }
          dot
        >
          {r.status || 'PENDING'}
        </AppBadge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (r) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {new Date(r.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Moderation Controls',
      render: (r) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {r.status !== 'PUBLISHED' && (
            <AppButton
              variant="primary"
              size="sm"
              onClick={() => setPublishingReviewId(r.id)}
              leftIcon={<Check size={14} />}
            >
              Publish
            </AppButton>
          )}
          {r.status !== 'HIDDEN' && (
            <AppButton
              variant="danger"
              size="sm"
              onClick={() => setHidingReviewId(r.id)}
              leftIcon={<EyeOff size={14} />}
            >
              Suppress
            </AppButton>
          )}
        </div>
      ),
    },
  ];

  const flagColumns: Column<any>[] = [
    {
      key: 'reason',
      header: 'Reported Violation Reason',
      render: (f) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--danger)', display: 'block' }}>
            {f.flagReason || f.reason || 'Content Flag'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Reported by User: #{f.reportedByUserId?.substring(0, 8) || 'Customer'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Report Status',
      render: (f) => (
        <AppBadge variant={f.status === 'RESOLVED' ? 'success' : 'warning'} dot>
          {f.status || 'PENDING'}
        </AppBadge>
      ),
    },
    {
      key: 'actions',
      header: 'Resolution',
      render: (f) => (
        <AppButton
          variant="secondary"
          size="sm"
          onClick={() => {
            setResolvingFlag(f);
            setResolutionStatus('RESOLVED');
          }}
        >
          Arbitrate Flag
        </AppButton>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Review Moderation & Dispute Arbitration</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Inspect user ratings, suppress abusive feedback, resolve policy violation reports, and arbitrate disputes
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.375rem' }}>
        <button
          onClick={() => {
            setActiveTab('MODERATION');
            setPage(1);
          }}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 600,
            border: '1px solid',
            borderColor: activeTab === 'MODERATION' ? 'var(--primary)' : 'var(--border-subtle)',
            backgroundColor: activeTab === 'MODERATION' ? 'var(--primary-light)' : 'transparent',
            color: activeTab === 'MODERATION' ? 'var(--text-accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          Review Moderation Feed
        </button>
        <button
          onClick={() => {
            setActiveTab('FLAGS');
            setPage(1);
          }}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 600,
            border: '1px solid',
            borderColor: activeTab === 'FLAGS' ? 'var(--color-status-error)' : 'var(--color-border-subtle)',
            backgroundColor: activeTab === 'FLAGS' ? 'var(--color-status-error-subtle)' : 'transparent',
            color: activeTab === 'FLAGS' ? 'var(--color-status-error)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          Flagged Reports
        </button>
      </div>

      <DataTable
        columns={activeTab === 'MODERATION' ? reviewColumns : flagColumns}
        data={activeTab === 'MODERATION' ? reviews : flags}
        isLoading={isLoading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
      />

      {/* Suppress Review Confirmation */}
      <ConfirmationDialog
        isOpen={!!hidingReviewId}
        onClose={() => setHidingReviewId(null)}
        onConfirm={handleHideReview}
        title="Suppress Review from Public View"
        message="Please provide a moderation reason for hiding this review. It will remain in the database for auditing but will be invisible in consumer apps."
        confirmText="Suppress Review"
        variant="danger"
        requireReason={true}
        reasonPlaceholder="e.g., Inappropriate language, spam, or unsubstantiated claims violating community guidelines..."
        isLoading={actionLoading}
      />

      {/* Publish Review Confirmation */}
      <ConfirmationDialog
        isOpen={!!publishingReviewId}
        onClose={() => setPublishingReviewId(null)}
        onConfirm={handlePublishReview}
        title="Publish Review to Catalog"
        message="Reinstate this review to the public catalog?"
        confirmText="Publish Review"
        variant="primary"
        isLoading={actionLoading}
      />

      {/* Resolve Flag Action Modal */}
      <ActionModal
        isOpen={!!resolvingFlag}
        onClose={() => setResolvingFlag(null)}
        title="Resolve Community Flag Report"
        footer={
          <>
            <AppButton variant="secondary" onClick={() => setResolvingFlag(null)}>
              Cancel
            </AppButton>
            <AppButton variant="primary" onClick={handleResolveFlag} isLoading={actionLoading}>
              Submit Decision
            </AppButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <AppSelect
            label="Resolution Outcome"
            value={resolutionStatus}
            onChange={(e) => setResolutionStatus(e.target.value)}
            options={[
              { value: 'RESOLVED', label: 'RESOLVED — Violation Confirmed & Handled' },
              { value: 'DISMISSED', label: 'DISMISSED — False Alarm / Policy Compliant' },
            ]}
          />
          <div className="form-group">
            <label className="form-label">Moderator Decision Notes *</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Explain the outcome of this flag review..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
            />
          </div>
        </div>
      </ActionModal>
    </div>
  );
}
