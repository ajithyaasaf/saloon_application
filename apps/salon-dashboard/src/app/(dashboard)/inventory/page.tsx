'use client';

import React, { useEffect, useState } from 'react';
import { ProductDto } from '@saloon/shared-types';
import { formatINR } from '@saloon/shared-utils';
import { AlertTriangle, Box, Package, Plus } from 'lucide-react';
import { useSalon } from '../../../context/SalonContext.js';
import { inventoryService } from '../../../services/salon-domain.services.js';
import { Card } from '../../../components/ui/Card.js';
import { Button } from '../../../components/ui/Button.js';
import { Badge } from '../../../components/ui/Badge.js';
import { StatCard } from '../../../components/ui/StatCard.js';

export default function InventoryPage() {
  const { salon } = useSalon();
  const [products, setProducts] = useState<ProductDto[]>([]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await inventoryService.getProducts(salon?.id);
        setProducts(data || []);
      } catch (err) {
        console.error('Failed to load inventory products:', err);
      }
    };

    loadProducts();
  }, [salon?.id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Inventory & Product Stock</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Track retail product inventory, salon consumption items, and purchase orders
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />}>
          Add Product SKU
        </Button>
      </div>

      <div className="grid-cols-3">
        <StatCard label="Total Stock Value" value={formatINR(84200)} icon={<Package size={20} />} />
        <StatCard label="Retail SKUs Active" value="18" icon={<Box size={20} />} />
        <StatCard label="Low Stock Alerts" value="2" change="Requires PO" isPositive={false} icon={<AlertTriangle size={20} />} />
      </div>

      <Card title="Product Inventory Directory" subtitle="Current on-hand stock and retail pricing">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU Code</th>
                <th>Retail Price</th>
                <th>Cost Price</th>
                <th>Type</th>
                <th>Stock Alert</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No products added yet. Click "Add Product SKU" above.
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr key={prod.id}>
                    <td style={{ fontWeight: 600 }}>{prod.name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{prod.sku}</td>
                    <td style={{ fontWeight: 700 }}>{formatINR(prod.retailPrice)}</td>
                    <td>{formatINR(prod.costPrice)}</td>
                    <td>
                      <Badge variant={prod.isForRetail ? 'primary' : 'info'}>
                        {prod.isForRetail ? 'Retail' : 'Backbar'}
                      </Badge>
                    </td>
                    <td>Min: {prod.minStockAlertLevel}</td>
                    <td>
                      <Badge variant={prod.isActive ? 'success' : 'warning'}>
                        {prod.isActive ? 'In Stock' : 'Out'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
