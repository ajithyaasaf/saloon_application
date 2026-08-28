'use client';

import React, { useState } from 'react';
import { FileCategory } from '@saloon/shared-types';
import { Image as ImageIcon, Plus } from 'lucide-react';
import { Card } from '../../../components/ui/Card.js';
import { MediaUploader } from '../../../components/media/MediaUploader.js';
import { Badge } from '../../../components/ui/Badge.js';

export default function MediaGalleryPage() {
  const [uploadedAssets, setUploadedAssets] = useState<{ url: string; id: string }[]>([]);

  const handleUploadComplete = (url: string, id: string) => {
    setUploadedAssets((prev) => [{ url, id }, ...prev]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Salon Media & Asset Gallery</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Upload high-resolution branch gallery photos, service portfolio images, and logos
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        <Card title="Upload New Media" subtitle="Direct cloud storage presigned upload">
          <MediaUploader
            category={FileCategory.SALON_GALLERY}
            onUploadComplete={handleUploadComplete}
          />
        </Card>

        <Card title="Uploaded Media Assets" subtitle="Live assets stored in Cloudflare R2 / S3 storage">
          {uploadedAssets.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No media uploaded in this session. Drop a file in the uploader on the left.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {uploadedAssets.map((asset) => (
                <div
                  key={asset.id}
                  style={{
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--color-border-subtle)',
                    background: 'var(--color-background-canvas)',
                  }}
                >
                  <img
                    src={asset.url}
                    alt="Uploaded Asset"
                    style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                  />
                  <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ID: {asset.id.slice(0, 8)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
