'use client';

import React, { useEffect, useState } from 'react';
import { CouponDto, DiscountType, FlashSaleDto } from '@saloon/shared-types';
import { formatINR } from '@saloon/shared-utils';
import { Gift, Plus, Sparkles, Tag, Trash2, Zap } from 'lucide-react';
import { useSalon } from '../../../context/SalonContext.js';
import { promotionsService } from '../../../services/salon-domain.services.js';
import { Card } from '../../../components/ui/Card.js';
import { Button } from '../../../components/ui/Button.js';
import { Badge } from '../../../components/ui/Badge.js';
import { Modal } from '../../../components/ui/Modal.js';
import { Input } from '../../../components/ui/Input.js';

export default function PromotionsPage() {
  const { salon } = useSalon();
  const [activeTab, setActiveTab] = useState<'COUPONS' | 'FLASH_SALES'>('COUPONS');
  const [coupons, setCoupons] = useState<CouponDto[]>([]);
  const [flashSales, setFlashSales] = useState<FlashSaleDto[]>([]);
  const [isAddCouponOpen, setIsAddCouponOpen] = useState(false);
  const [isAddFlashSaleOpen, setIsAddFlashSaleOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Coupon Form
  const [code, setCode] = useState('DIWALI25');
  const [name, setName] = useState('Diwali Festival Special');
  const [discountValue, setDiscountValue] = useState<number | string>(25);
  const [minBookingAmount, setMinBookingAmount] = useState<number | string>(1000);

  // Flash Sale Form
  const [flashTitle, setFlashTitle] = useState('Happy Hours Flash Deal');
  const [flashDiscount, setFlashDiscount] = useState<number | string>(30);
  const [flashHours, setFlashHours] = useState<number | string>(4);

  const loadData = async () => {
    try {
      const [couponData, flashData] = await Promise.all([
        promotionsService.getCoupons(salon?.id),
        promotionsService.getFlashSales(salon?.id),
      ]);
      setCoupons(couponData || []);
      setFlashSales(flashData || []);
    } catch (err) {
      console.error('Failed to load promotions:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [salon?.id]);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon) return;
    setIsSubmitting(true);
    try {
      await promotionsService.createCoupon({
        salonId: salon.id,
        code: code.toUpperCase(),
        name,
        discountType: DiscountType.PERCENTAGE,
        discountValue: Number(discountValue) || 0,
        minBookingAmount: Number(minBookingAmount) || 0,
        perCustomerLimit: 1,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
      });
      setIsAddCouponOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to create coupon:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    try {
      await promotionsService.deleteCoupon(couponId);
      await loadData();
    } catch (err) {
      console.error('Failed to delete coupon:', err);
    }
  };

  const handleCreateFlashSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon) return;
    setIsSubmitting(true);
    try {
      const startTime = new Date();
      const endTime = new Date(Date.now() + (Number(flashHours) || 1) * 3600000);
      await promotionsService.createFlashSale({
        salonId: salon.id,
        title: flashTitle,
        discountPercentage: Number(flashDiscount) || 0,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        serviceIds: [],
      });
      setIsAddFlashSaleOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to create flash sale:', err);
    } finally {
      setIsSubmitting(false);
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
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {activeTab === 'COUPONS' ? (
            <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsAddCouponOpen(true)}>
              Create Campaign Code
            </Button>
          ) : (
            <Button variant="primary" leftIcon={<Zap size={16} />} onClick={() => setIsAddFlashSaleOpen(true)}>
              Launch Flash Sale
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <Button
          variant={activeTab === 'COUPONS' ? 'primary' : 'secondary'}
          size="sm"
          leftIcon={<Tag size={14} />}
          onClick={() => setActiveTab('COUPONS')}
        >
          Promo Coupons ({coupons.length})
        </Button>
        <Button
          variant={activeTab === 'FLASH_SALES' ? 'primary' : 'secondary'}
          size="sm"
          leftIcon={<Zap size={14} />}
          onClick={() => setActiveTab('FLASH_SALES')}
        >
          Urgent Flash Deals ({flashSales.length})
        </Button>
      </div>

      {/* Coupons View */}
      {activeTab === 'COUPONS' && (
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
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
                      <td>
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={<Trash2 size={12} />}
                          onClick={() => handleDeleteCoupon(c.id)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Flash Sales View */}
      {activeTab === 'FLASH_SALES' && (
        <Card title="Live Flash Deals" subtitle="Limited-time slot discounts to drive off-peak demand">
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Flash Sale Title</th>
                  <th>Discount Rate</th>
                  <th>Window Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {flashSales.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No active flash deals right now. Click "Launch Flash Sale" above.
                    </td>
                  </tr>
                ) : (
                  flashSales.map((fs) => (
                    <tr key={fs.id}>
                      <td style={{ fontWeight: 600 }}>{fs.title}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fs.discountPercentage}% OFF</td>
                      <td>{new Date(fs.startTime).toLocaleTimeString()} – {new Date(fs.endTime).toLocaleTimeString()}</td>
                      <td>
                        <Badge variant={fs.status === 'ACTIVE' ? 'success' : 'warning'}>{fs.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Coupon Modal */}
      <Modal isOpen={isAddCouponOpen} onClose={() => setIsAddCouponOpen(false)} title="Create Discount Coupon">
        <form onSubmit={handleCreateCoupon}>
          <Input label="Coupon Code (Alphanumeric)" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. SUMMER20" />
          <Input label="Campaign Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer Haircut Deal" />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Discount Percentage (%)" type="number" required value={discountValue} onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))} />
            <Input label="Min Booking Amount (INR)" type="number" required value={minBookingAmount} onChange={(e) => setMinBookingAmount(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsAddCouponOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Launching...' : 'Launch Promo'}</Button>
          </div>
        </form>
      </Modal>

      {/* Create Flash Sale Modal */}
      <Modal isOpen={isAddFlashSaleOpen} onClose={() => setIsAddFlashSaleOpen(false)} title="Launch Urgent Flash Deal">
        <form onSubmit={handleCreateFlashSale}>
          <Input label="Deal Name" required value={flashTitle} onChange={(e) => setFlashTitle(e.target.value)} placeholder="e.g. Afternoon Happy Hours" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Discount Percentage (%)" type="number" required value={flashDiscount} onChange={(e) => setFlashDiscount(e.target.value === '' ? '' : Number(e.target.value))} />
            <Input label="Duration (Hours from now)" type="number" required value={flashHours} onChange={(e) => setFlashHours(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsAddFlashSaleOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Starting...' : 'Activate Flash Deal'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
