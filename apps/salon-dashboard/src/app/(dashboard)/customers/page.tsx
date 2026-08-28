'use client';

import React, { useEffect, useState } from 'react';
import { ReviewDto } from '@saloon/shared-types';
import { maskPhone } from '@saloon/shared-utils';
import { MessageSquare, Star, Users } from 'lucide-react';
import { useSalon } from '../../../context/SalonContext.js';
import { customerService } from '../../../services/salon-domain.services.js';
import { Card } from '../../../components/ui/Card.js';
import { Button } from '../../../components/ui/Button.js';
import { Badge } from '../../../components/ui/Badge.js';
import { Modal } from '../../../components/ui/Modal.js';
import { Input } from '../../../components/ui/Input.js';

export default function CustomersPage() {
  const { selectedBranch } = useSalon();
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [selectedReview, setSelectedReview] = useState<ReviewDto | null>(null);
  const [replyText, setReplyText] = useState('');

  const loadReviews = async () => {
    if (!selectedBranch) return;
    try {
      const data = await customerService.getBranchReviews(selectedBranch.id);
      setReviews(data || []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [selectedBranch?.id]);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview) return;
    try {
      await customerService.replyToReview(selectedReview.id, replyText);
      setSelectedReview(null);
      setReplyText('');
      await loadReviews();
    } catch (err) {
      console.error('Failed to submit review reply:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Customer Feedback & Reviews</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Inspect client satisfaction, overall ratings, and respond to verified appointment feedback
        </p>
      </div>

      {/* Reviews List */}
      <Card title="Customer Reviews" subtitle="Verified ratings left by clients post-service completion">
        {reviews.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No customer reviews recorded yet for this branch.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((rev) => (
              <div
                key={rev.id}
                style={{
                  padding: '1.25rem',
                  background: 'var(--color-background-surface)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{rev.customerName}</h4>
                    <span style={{ color: 'var(--color-status-warning)', fontSize: '0.875rem', fontWeight: 600 }}>
                      {'★'.repeat(rev.overallRating)}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  "{rev.comment || 'Great experience!'}"
                </p>

                {rev.reply ? (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--primary-light)',
                      border: '1px solid var(--border-accent)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <p style={{ fontWeight: 600, color: 'var(--text-accent)' }}>Salon Response:</p>
                    <p style={{ marginTop: '0.25rem' }}>{rev.reply.comment}</p>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<MessageSquare size={12} />}
                    onClick={() => {
                      setSelectedReview(rev);
                      setReplyText('');
                    }}
                  >
                    Reply to Review
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Review Reply Modal */}
      <Modal isOpen={!!selectedReview} onClose={() => setSelectedReview(null)} title="Reply to Customer Review">
        <form onSubmit={handleReplySubmit}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Replying to <strong>{selectedReview?.customerName}</strong>
          </p>
          <div className="form-group">
            <label className="form-label">Your Response</label>
            <textarea
              className="form-textarea"
              rows={4}
              required
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Thank you for visiting! We look forward to seeing you again soon."
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setSelectedReview(null)}>Cancel</Button>
            <Button variant="primary" type="submit">Post Response</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
