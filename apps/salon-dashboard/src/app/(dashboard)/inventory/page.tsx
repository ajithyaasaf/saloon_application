'use client';

import React, { useEffect, useState } from 'react';
import { ProductDto } from '@saloon/shared-types';
import { formatINR } from '@saloon/shared-utils';
import { AlertTriangle, Box, Edit2, Package, Plus } from 'lucide-react';
import { useSalon } from '../../../context/SalonContext.js';
import { inventoryService } from '../../../services/salon-domain.services.js';
import { Card } from '../../../components/ui/Card.js';
import { Button } from '../../../components/ui/Button.js';
import { Badge } from '../../../components/ui/Badge.js';
import { StatCard } from '../../../components/ui/StatCard.js';
import { Modal } from '../../../components/ui/Modal.js';
import { Input } from '../../../components/ui/Input.js';

export default function InventoryPage() {
  const { salon } = useSalon();
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);

  // New Product Form
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [retailPrice, setRetailPrice] = useState(499);
  const [costPrice, setCostPrice] = useState(250);
  const [isForRetail, setIsForRetail] = useState(true);
  const [minStockAlertLevel, setMinStockAlertLevel] = useState(5);

  // Edit Product Form
  const [editName, setEditName] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editRetailPrice, setEditRetailPrice] = useState(499);
  const [editCostPrice, setEditCostPrice] = useState(250);
  const [editIsForRetail, setEditIsForRetail] = useState(true);
  const [editMinStockAlertLevel, setEditMinStockAlertLevel] = useState(5);
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProducts = async () => {
    try {
      const data = await inventoryService.getProducts(salon?.id);
      setProducts(data || []);
    } catch (err) {
      console.error('Failed to load inventory products:', err);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [salon?.id]);

  const handleOpenEdit = (prod: ProductDto) => {
    setSelectedProduct(prod);
    setEditName(prod.name || '');
    setEditSku(prod.sku || '');
    setEditRetailPrice(prod.retailPrice ?? 0);
    setEditCostPrice(prod.costPrice ?? 0);
    setEditIsForRetail(prod.isForRetail !== false);
    setEditMinStockAlertLevel(prod.minStockAlertLevel ?? 5);
    setEditIsActive(prod.isActive !== false);
    setIsEditProductOpen(true);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await inventoryService.createProduct({
        salonId: salon?.id,
        name,
        sku,
        retailPrice: Number(retailPrice),
        costPrice: Number(costPrice),
        isForRetail,
        minStockAlertLevel: Number(minStockAlertLevel),
      });
      setIsAddProductOpen(false);
      setName('');
      setSku('');
      await loadProducts();
    } catch (err) {
      console.error('Failed to create product:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setIsSubmitting(true);
    try {
      await inventoryService.updateProduct(selectedProduct.id, {
        name: editName,
        sku: editSku,
        retailPrice: Number(editRetailPrice),
        costPrice: Number(editCostPrice),
        isForRetail: editIsForRetail,
        minStockAlertLevel: Number(editMinStockAlertLevel),
        isActive: editIsActive,
      });
      setIsEditProductOpen(false);
      setSelectedProduct(null);
      await loadProducts();
    } catch (err) {
      console.error('Failed to update product:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct || !confirm(`Delete product "${selectedProduct.name}"?`)) return;
    setIsSubmitting(true);
    try {
      await inventoryService.deleteProduct(selectedProduct.id);
      setIsEditProductOpen(false);
      setSelectedProduct(null);
      await loadProducts();
    } catch (err) {
      console.error('Failed to delete product:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Inventory & Product Stock</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Track retail product inventory, salon consumption items, and purchase orders
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsAddProductOpen(true)}>
          Add Product SKU
        </Button>
      </div>

      <div className="grid-cols-3">
        <StatCard label="Total Stock Value" value={formatINR(84200)} icon={<Package size={20} />} />
        <StatCard label="Retail SKUs Active" value={products.length ? String(products.length) : '18'} icon={<Box size={20} />} />
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No products added yet. Click "Add Product SKU" above.
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr key={prod.id}>
                    <td style={{ fontWeight: 600 }}>{prod.name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{prod.sku}</td>
                    <td style={{ fontWeight: 700 }}>{formatINR(prod.retailPrice || 0)}</td>
                    <td>{formatINR(prod.costPrice || 0)}</td>
                    <td>
                      <Badge variant={prod.isForRetail ? 'primary' : 'info'}>
                        {prod.isForRetail ? 'Retail' : 'Backbar'}
                      </Badge>
                    </td>
                    <td>Min: {prod.minStockAlertLevel || 5}</td>
                    <td>
                      <Badge variant={prod.isActive ? 'success' : 'warning'}>
                        {prod.isActive ? 'In Stock' : 'Out'}
                      </Badge>
                    </td>
                    <td>
                      <Button variant="secondary" size="sm" leftIcon={<Edit2 size={12} />} onClick={() => handleOpenEdit(prod)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Product Modal */}
      <Modal isOpen={isAddProductOpen} onClose={() => setIsAddProductOpen(false)} title="Add New Product SKU">
        <form onSubmit={handleCreateProduct}>
          <Input label="Product Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Moroccan Oil Treatment 100ml" />
          <Input label="SKU / Barcode" required value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. MOR-OIL-100" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Retail Price (INR)" type="number" required value={retailPrice} onChange={(e) => setRetailPrice(Number(e.target.value))} />
            <Input label="Cost Price (INR)" type="number" required value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))} />
          </div>
          <Input label="Low Stock Alert Level" type="number" required value={minStockAlertLevel} onChange={(e) => setMinStockAlertLevel(Number(e.target.value))} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
            <input type="checkbox" id="isForRetail" checked={isForRetail} onChange={(e) => setIsForRetail(e.target.checked)} />
            <label htmlFor="isForRetail" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>Available for Retail Client Purchase</label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsAddProductOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create SKU'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal isOpen={isEditProductOpen} onClose={() => setIsEditProductOpen(false)} title={`Edit Product: ${selectedProduct?.name || ''}`}>
        <form onSubmit={handleUpdateProduct}>
          <Input label="Product Name" required value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Input label="SKU / Barcode" required value={editSku} onChange={(e) => setEditSku(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Retail Price (INR)" type="number" required value={editRetailPrice} onChange={(e) => setEditRetailPrice(Number(e.target.value))} />
            <Input label="Cost Price (INR)" type="number" required value={editCostPrice} onChange={(e) => setEditCostPrice(Number(e.target.value))} />
          </div>
          <Input label="Low Stock Alert Level" type="number" required value={editMinStockAlertLevel} onChange={(e) => setEditMinStockAlertLevel(Number(e.target.value))} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
            <input type="checkbox" id="editIsActive" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} />
            <label htmlFor="editIsActive" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>Product SKU is Active & In-Stock</label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <Button variant="danger" type="button" disabled={isSubmitting} onClick={handleDeleteProduct}>Delete SKU</Button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button variant="secondary" type="button" onClick={() => setIsEditProductOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
