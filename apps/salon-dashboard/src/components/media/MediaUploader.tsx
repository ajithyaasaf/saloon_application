'use client';

import React, { useState } from 'react';
import { FileCategory, FileVisibility } from '@saloon/shared-types';
import { formatBytes } from '@saloon/shared-utils';
import { CheckCircle, Image as ImageIcon, UploadCloud } from 'lucide-react';
import { mediaService } from '../../services/salon-domain.services.js';
import { useSalon } from '../../context/SalonContext.js';
import { Button } from '../ui/Button.js';

export interface MediaUploaderProps {
  category: FileCategory;
  onUploadComplete?: (assetUrl: string, assetId: string) => void;
  visibility?: FileVisibility;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  category,
  onUploadComplete,
  visibility = FileVisibility.PUBLIC,
}) => {
  const { salon } = useSalon();
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const asset = await mediaService.uploadFile(file, category, salon?.id, visibility);
      const publicUrl = asset.publicUrl || asset.downloadUrl || '';
      setUploadedUrl(publicUrl);
      if (onUploadComplete) {
        onUploadComplete(publicUrl, asset.id);
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message || 'Media upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <label
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
          border: '2px dashed var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-background-surface)',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileChange}
          disabled={isUploading}
          style={{ display: 'none' }}
        />
        {isUploading ? (
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '1.75rem', display: 'inline-block', animation: 'spin 1s linear infinite' }}>
              ⏳
            </span>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
              Minting presigned upload ticket & transferring...
            </p>
          </div>
        ) : uploadedUrl ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={32} style={{ color: 'var(--success)', marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)' }}>
              File Uploaded Successfully!
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Click to replace image
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <UploadCloud size={32} style={{ color: 'var(--text-accent)', marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Click to browse or drop file here</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Supports JPG, PNG, WEBP, PDF (Max 10 MB)
            </p>
          </div>
        )}
      </label>

      {error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{error}</span>
      )}
    </div>
  );
};
