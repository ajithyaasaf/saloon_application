'use client';

import React, { useEffect, useState } from 'react';
import { CouponDto, DiscountType } from '@saloon/shared-types';
import { formatINR } from '@saloon/shared-utils';
import { Gift, Plus, Sparkles, Tag, Zap } from 'lucide-react';
import { useSalon } from '../../../context/SalonContext.js';
import { promotionsService } from '../../../services/salon-domain.services.js';
import { Card } from '../../../components/ui/Card.js';
import { Button } from '../../../components/ui/Button.js';
import { Badge } from '../../../components/ui/Badge.js';
import { Modal } from '../../../components/ui/Modal.js';
import { Input } from '../../../components/ui/Input.js';

export default function PromotionsPage() {
  const { salon } = useSalon();
  const [coupons, setCoupons] = useState<CouponDto[]>([]);
  const [isAddCouponOpen, setIsAddCouponOpen] = useState(false);

  // Form
  const [code, setCode] = useState('DIWALI25');
  const [name, setName] = useState('Diwali Festival Special');
  const [discountValue, setDiscountValue] = useState(25);
  const [minBookingAmount, setMinBookingAmount] = useState(1000);

  const loadCoupons = async () => {
    try {
      const data = await promotionsService.getCoupons(salon?.id);
      setCoupons(data || []);
    } catch (err) {
      console.error('Failed to load promotions:', err);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, [salon?.id]);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon) return;
    try {
      await promotionsService.createCoupon({
        salonId: salon.id,
        code: code.toUpperCase(),
        name,
        discountType: DiscountType.PERCENTAGE,
        discountValue: Number(discountValue),
        minBookingAmount: Number(minBookingAmount),
        perCustomerLimit: 1,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
      });
      setIsAddCouponOpen(false);
      await loadCoupons();
    } catch (err) {
      console.error('Failed to create coupon:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Promotions, Coupons & Flash Deals</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Boost client retention with discount promo codes, auto-apply deals, and urgent flash sales
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsAddCouponOpen(true)}>
          Create Campaign Code
        </Button>
      </div>

      {/* Coupons Table */}
      <Card title="Active Promotional Codes" subtitle="Discount codes applicable at checkout">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Coupon Code</th>
                <th>Campaign Name</th>
                <th>Discount</th>
                <th>Min Spend</th>
                <th>Usage Limit</th>
                <th>Redemptions</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No promo codes created yet. Click "Create Campaign Code" above.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-accent)' }}>
                      {c.code}
                    </td>
                    <td>{c.name}</td>
                    <td style={{ fontWeight: 600 }}>
                      {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% OFF` : formatINR(c.discountValue)}
                    </td>
                    <td>{c.minBookingAmount ? formatINR(c.minBookingAmount) : 'None'}</td>
                    <td>{c.perCustomerLimit} / client</td>
                    <td>{c.timesUsed || 0}</td>
                    <td>
                      <Badge variant={c.isActive ? 'success' : 'warning'}>
                        {c.isActive ? 'Active' : 'Expired'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Coupon Modal */}
      <Modal isOpen={isAddCouponOpen} onClose={() => setIsAddCouponOpen(false)} title="Create Discount Coupon">
        <form onSubmit={handleCreateCoupon}>
          <Input label="Coupon Code (Alphanumeric)" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. SUMMER20" />
          <Input label="Campaign Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer Haircut Deal" />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Discount Percentage (%)" type="number" required value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} />
            <Input label="Min Booking Amount (INR)" type="number" required value={minBookingAmount} onChange={(e) => setMinBookingAmount(Number(e.target.value))} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsAddCouponOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Launch Promo</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
