'use client';

import React from 'react';
import { formatINR } from '@saloon/shared-utils';
import { BarChart2, DollarSign, TrendingUp, Users } from 'lucide-react';
import { Card } from '../../../components/ui/Card.js';
import { StatCard } from '../../../components/ui/StatCard.js';
import { Badge } from '../../../components/ui/Badge.js';

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = React.useState<'30D' | 'THIS_MONTH' | 'QUARTER'>('THIS_MONTH');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Financial & Operational Analytics</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Real-time Gross Merchandise Value (GMV), net revenue, and stylist performance metrics
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--color-background-surface)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)' }}>
          <button
            onClick={() => setTimeframe('THIS_MONTH')}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              background: timeframe === 'THIS_MONTH' ? 'var(--color-action-primary)' : 'transparent',
              color: timeframe === 'THIS_MONTH' ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
            }}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeframe('30D')}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              background: timeframe === '30D' ? 'var(--color-action-primary)' : 'transparent',
              color: timeframe === '30D' ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
            }}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeframe('QUARTER')}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              background: timeframe === 'QUARTER' ? 'var(--color-action-primary)' : 'transparent',
              color: timeframe === 'QUARTER' ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
            }}
          >
            Quarterly
          </button>
        </div>
      </div>

      <div className="grid-cols-4">
        <StatCard label="Monthly GMV" value={formatINR(425000)} change="18.2% vs last month" isPositive={true} icon={<DollarSign size={20} />} />
        <StatCard label="Completed Bookings" value="284" change="94.2% completion rate" isPositive={true} icon={<TrendingUp size={20} />} />
        <StatCard label="New Clients Acquired" value="68" icon={<Users size={20} />} />
        <StatCard label="Average Basket Size" value={formatINR(1496)} change="5.4% growth" isPositive={true} icon={<BarChart2 size={20} />} />
      </div>

      <Card title="Top Performing Stylists & Commission" subtitle="Revenue generated per team member this month">
        <div className="data-table-wrapper" style={{ marginTop: '0.5rem' }}>
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Stylist Name</th>
                  <th style={{ width: '20%' }}>Role / Title</th>
                  <th style={{ width: '15%' }} className="align-center">Appointments</th>
                  <th style={{ width: '18%' }} className="align-right">Revenue Generated</th>
                  <th style={{ width: '14%' }} className="align-right">Commission Earned</th>
                  <th style={{ width: '8%' }} className="align-center">Rating</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--color-action-primary-subtle)',
                          color: 'var(--color-action-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        AS
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Anita Sharma</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>Senior Colorist</span>
                  </td>
                  <td className="align-center">
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>72</span>
                  </td>
                  <td className="align-right">
                    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatINR(124000)}</span>
                  </td>
                  <td className="align-right">
                    <span style={{ fontWeight: 600, color: 'var(--color-status-success)' }}>{formatINR(18600)}</span>
                  </td>
                  <td className="align-center">
                    <Badge variant="warning">★ 4.9</Badge>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--color-action-primary-subtle)',
                          color: 'var(--color-action-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        RK
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Rajesh Kumar</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>Master Barber</span>
                  </td>
                  <td className="align-center">
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>64</span>
                  </td>
                  <td className="align-right">
                    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatINR(98000)}</span>
                  </td>
                  <td className="align-right">
                    <span style={{ fontWeight: 600, color: 'var(--color-status-success)' }}>{formatINR(14700)}</span>
                  </td>
                  <td className="align-center">
                    <Badge variant="warning">★ 4.8</Badge>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--color-action-primary-subtle)',
                          color: 'var(--color-action-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        PN
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Priya Nair</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>Skin & Facial Specialist</span>
                  </td>
                  <td className="align-center">
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>58</span>
                  </td>
                  <td className="align-right">
                    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatINR(89000)}</span>
                  </td>
                  <td className="align-right">
                    <span style={{ fontWeight: 600, color: 'var(--color-status-success)' }}>{formatINR(13350)}</span>
                  </td>
                  <td className="align-center">
                    <Badge variant="warning">★ 4.9</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
