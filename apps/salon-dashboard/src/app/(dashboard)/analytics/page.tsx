'use client';

import React from 'react';
import { formatINR } from '@saloon/shared-utils';
import { BarChart2, DollarSign, TrendingUp, Users } from 'lucide-react';
import { Card } from '../../../components/ui/Card.js';
import { StatCard } from '../../../components/ui/StatCard.js';
import { Badge } from '../../../components/ui/Badge.js';

export default function AnalyticsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Financial & Operational Analytics</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Real-time Gross Merchandise Value (GMV), net revenue, and stylist performance metrics
        </p>
      </div>

      <div className="grid-cols-4">
        <StatCard label="Monthly GMV" value={formatINR(425000)} change="18.2% vs last month" isPositive={true} icon={<DollarSign size={20} />} />
        <StatCard label="Completed Bookings" value="284" change="94.2% completion rate" isPositive={true} icon={<TrendingUp size={20} />} />
        <StatCard label="New Clients Acquired" value="68" icon={<Users size={20} />} />
        <StatCard label="Average Basket Size" value={formatINR(1496)} change="5.4% growth" isPositive={true} icon={<BarChart2 size={20} />} />
      </div>

      <Card title="Top Performing Stylists & Commission" subtitle="Revenue generated per team member this month">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Stylist</th>
                <th>Role / Title</th>
                <th>Appointments Done</th>
                <th>Total Revenue Generated</th>
                <th>Commission Earned</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>Anita Sharma</td>
                <td>Senior Colorist</td>
                <td>72</td>
                <td style={{ fontWeight: 700 }}>{formatINR(124000)}</td>
                <td style={{ color: 'var(--success)' }}>{formatINR(18600)}</td>
                <td>4.9 ★</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Rajesh Kumar</td>
                <td>Master Barber</td>
                <td>64</td>
                <td style={{ fontWeight: 700 }}>{formatINR(98000)}</td>
                <td style={{ color: 'var(--success)' }}>{formatINR(14700)}</td>
                <td>4.8 ★</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Priya Nair</td>
                <td>Skin & Facial Specialist</td>
                <td>58</td>
                <td style={{ fontWeight: 700 }}>{formatINR(89000)}</td>
                <td style={{ color: 'var(--success)' }}>{formatINR(13350)}</td>
                <td>4.9 ★</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
