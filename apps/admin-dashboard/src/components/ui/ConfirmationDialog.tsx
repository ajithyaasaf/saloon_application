import React, { useState } from 'react';
import { ActionModal } from './ActionModal';
import { AppButton } from './AppButton';
import { AlertTriangle, Info, AlertOctagon } from 'lucide-react';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void> | void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  isLoading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  requireReason = false,
  reasonLabel = 'Audit / Justification Reason',
  reasonPlaceholder = 'Please specify the reason for this administrative action...',
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      setError('A reason is mandatory for this administrative operation.');
      return;
    }
    setError('');
    await onConfirm(reason.trim());
    setReason('');
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertOctagon size={24} color="var(--danger)" />;
      case 'warning':
        return <AlertTriangle size={24} color="var(--warning)" />;
      default:
        return <Info size={24} color="var(--primary)" />;
    }
  };

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="480px"
      footer={
        <>
          <AppButton variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </AppButton>
          <AppButton
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </AppButton>
        </>
      }
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ flexShrink: 0 }}>{getIcon()}</div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {message}
          </p>

          {requireReason && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{reasonLabel} *</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder={reasonPlaceholder}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (e.target.value.trim()) setError('');
                }}
                style={{
                  borderColor: error ? 'var(--danger)' : undefined,
                  resize: 'vertical',
                }}
              />
              {error && (
                <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
                  {error}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </ActionModal>
  );
};
