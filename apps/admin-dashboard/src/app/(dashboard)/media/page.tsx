'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminMediaService } from '@/services/admin-domain.services';
import { FileAssetDto } from '@saloon/shared-types';
import { DataTable, Column } from '@/components/ui/DataTable';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Drawer } from '@/components/ui/Drawer';
import { useToast } from '@/context/ToastContext';
import { Trash2, RotateCcw, Eye, FileText, Image as ImageIcon } from 'lucide-react';

export default function MediaPage() {
  const { success, danger } = useToast();
  const [mediaList, setMediaList] = useState<FileAssetDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(undefined);

  const [selectedAsset, setSelectedAsset] = useState<FileAssetDto | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);
  const [restoringAssetId, setRestoringAssetId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMedia = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminMediaService.searchMedia({
        page,
        limit: 10,
        search: search.trim() || undefined,
        includeDeleted: true,
      });
      setMediaList(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      danger('Failed to load media assets', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [search, page, danger]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleDeleteMedia = async () => {
    if (!deletingAssetId) return;
    setActionLoading(true);
    try {
      await adminMediaService.deleteMedia(deletingAssetId);
      success('Media Asset Removed', 'File marked as deleted in platform storage registry.');
      setDeletingAssetId(null);
      fetchMedia();
    } catch (err: any) {
      danger('Delete Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreMedia = async () => {
    if (!restoringAssetId) return;
    setActionLoading(true);
    try {
      await adminMediaService.restoreMedia(restoringAssetId);
      success('Media Asset Restored', 'File reinstated to active media repository.');
      setRestoringAssetId(null);
      fetchMedia();
    } catch (err: any) {
      danger('Restore Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const columns: Column<FileAssetDto>[] = [
    {
      key: 'originalFileName',
      header: 'File Asset',
      render: (f) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-action-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-action-primary)',
            }}
          >
            {f.mimeType?.startsWith('image/') ? <ImageIcon size={18} /> : <FileText size={18} />}
          </div>
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
              {f.originalFileName || f.storedFileName || 'Uploaded File'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {f.mimeType || 'application/octet-stream'} • {formatBytes(f.sizeBytes)}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category / Purpose',
      render: (f) => <AppBadge variant="purple">{f.category || 'GENERAL'}</AppBadge>,
    },
    {
      key: 'status',
      header: 'Storage State',
      render: (f) => (
        <AppBadge variant={f.status === 'DELETED' ? 'danger' : 'success'} dot>
          {f.status || 'READY'}
        </AppBadge>
      ),
    },
    {
      key: 'actions',
      header: 'Governance Controls',
      render: (f) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <AppButton
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedAsset(f);
              setIsDrawerOpen(true);
            }}
            leftIcon={<Eye size={14} />}
          >
            Inspect
          </AppButton>
          {f.status !== 'DELETED' ? (
            <AppButton
              variant="danger"
              size="sm"
              onClick={() => setDeletingAssetId(f.id)}
              leftIcon={<Trash2 size={14} />}
            >
              Delete
            </AppButton>
          ) : (
            <AppButton
              variant="primary"
              size="sm"
              onClick={() => setRestoringAssetId(f.id)}
              leftIcon={<RotateCcw size={14} />}
            >
              Restore
            </AppButton>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Media Asset Governance</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Inspect Cloudflare R2 / S3 storage keys, quarantine inappropriate media, and audit cross-tenant uploads
        </p>
      </div>

      <DataTable
        columns={columns}
        data={mediaList}
        isLoading={isLoading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search media by filename..."
      />

      {/* Asset Inspection Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedAsset?.originalFileName || selectedAsset?.storedFileName || 'Media Asset Details'}
        subtitle={`Asset ID: ${selectedAsset?.id ?? ''}`}
      >
        {selectedAsset && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <AppBadge variant={selectedAsset.status === 'DELETED' ? 'danger' : 'success'}>
                {selectedAsset.status || 'READY'}
              </AppBadge>
              <AppBadge variant="purple">{selectedAsset.category || 'MEDIA'}</AppBadge>
            </div>

            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Cloud Storage URL / Key
                </span>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-accent)', wordBreak: 'break-all', marginTop: '0.25rem' }}>
                  {selectedAsset.publicUrl || selectedAsset.objectKey || 'https://r2.saloon.internal/assets/...'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  File Size & Mime
                </span>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  {formatBytes(selectedAsset.sizeBytes)} ({selectedAsset.mimeType})
                </p>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={!!deletingAssetId}
        onClose={() => setDeletingAssetId(null)}
        onConfirm={handleDeleteMedia}
        title="Quarantine & Delete Media File"
        message="Are you sure you want to delete this media asset? The file will be marked as deleted and revoked from all public CDN routes."
        confirmText="Delete File"
        variant="danger"
        isLoading={actionLoading}
      />

      {/* Restore Confirmation */}
      <ConfirmationDialog
        isOpen={!!restoringAssetId}
        onClose={() => setRestoringAssetId(null)}
        onConfirm={handleRestoreMedia}
        title="Restore Media Asset"
        message="Reinstate this media asset to active CDN status?"
        confirmText="Restore File"
        variant="primary"
        isLoading={actionLoading}
      />
    </div>
  );
}
