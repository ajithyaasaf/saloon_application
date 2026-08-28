'use client';

import React, { useEffect, useState } from 'react';
import { Gender, ServiceCategoryDto, ServiceDto } from '@saloon/shared-types';
import { formatDuration, formatINR } from '@saloon/shared-utils';
import { Edit2, Plus, Scissors, Sparkles } from 'lucide-react';
import { useSalon } from '../../../context/SalonContext.js';
import { catalogService } from '../../../services/salon-domain.services.js';
import { Card } from '../../../components/ui/Card.js';
import { Button } from '../../../components/ui/Button.js';
import { Badge } from '../../../components/ui/Badge.js';
import { Modal } from '../../../components/ui/Modal.js';
import { Input } from '../../../components/ui/Input.js';
import { Select } from '../../../components/ui/Select.js';

export default function ServicesPage() {
  const { salon } = useSalon();
  const [categories, setCategories] = useState<ServiceCategoryDto[]>([]);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  // New Service Form
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState(799);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [targetGender, setTargetGender] = useState<Gender>(Gender.OTHER);

  // New Category Form
  const [categoryName, setCategoryName] = useState('');

  // Edit Service Form
  const [isEditServiceOpen, setIsEditServiceOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceDto | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editBasePrice, setEditBasePrice] = useState(799);
  const [editDurationMinutes, setEditDurationMinutes] = useState(45);
  const [editTargetGender, setEditTargetGender] = useState<Gender>(Gender.OTHER);
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCatalog = async () => {
    try {
      const cats = await catalogService.getCategories();
      setCategories(cats || []);
      if (cats.length > 0 && !categoryId) {
        setCategoryId(cats[0].id);
      }

      const srvs = await catalogService.getServices({ salonId: salon?.id });
      setServices(srvs || []);
    } catch (err) {
      console.error('Failed to load services:', err);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [salon?.id]);

  const handleOpenEdit = (srv: ServiceDto) => {
    setSelectedService(srv);
    setEditName(srv.name || '');
    setEditCategoryId(srv.categoryId || (categories[0]?.id ?? ''));
    setEditBasePrice(srv.basePrice ?? 0);
    setEditDurationMinutes(srv.durationMinutes ?? 30);
    setEditTargetGender((srv.targetGender as Gender) || Gender.OTHER);
    setEditIsActive(srv.isActive !== false);
    setIsEditServiceOpen(true);
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await catalogService.createService({
        categoryId,
        name,
        basePrice: Number(basePrice),
        durationMinutes: Number(durationMinutes),
        targetGender,
      });
      setIsAddServiceOpen(false);
      setName('');
      await loadCatalog();
    } catch (err) {
      console.error('Failed to create service:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    setIsSubmitting(true);
    try {
      await catalogService.updateService(selectedService.id, {
        categoryId: editCategoryId,
        name: editName,
        basePrice: Number(editBasePrice),
        durationMinutes: Number(editDurationMinutes),
        targetGender: editTargetGender,
        isActive: editIsActive,
      });
      setIsEditServiceOpen(false);
      setSelectedService(null);
      await loadCatalog();
    } catch (err) {
      console.error('Failed to update service:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async () => {
    if (!selectedService || !confirm(`Are you sure you want to delete "${selectedService.name}"?`)) return;
    setIsSubmitting(true);
    try {
      await catalogService.deleteService(selectedService.id);
      setIsEditServiceOpen(false);
      setSelectedService(null);
      await loadCatalog();
    } catch (err) {
      console.error('Failed to delete service:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await catalogService.createCategory({ name: categoryName });
      setIsAddCategoryOpen(false);
      setCategoryName('');
      await loadCatalog();
    } catch (err) {
      console.error('Failed to create category:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Service Catalog & Pricing</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Configure treatment menus, target genders, durations, and base prices
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" leftIcon={<Plus size={16} />} onClick={() => setIsAddCategoryOpen(true)}>
            Add Category
          </Button>
          <Button variant="primary" leftIcon={<Scissors size={16} />} onClick={() => setIsAddServiceOpen(true)}>
            Add New Treatment
          </Button>
        </div>
      </div>

      {/* Services Table */}
      <Card title="Available Treatments & Menu" subtitle="Live services offered to clients during slot bookings">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Treatment Name</th>
                <th>Category</th>
                <th>Target</th>
                <th>Base Price</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No services created yet. Click "Add New Treatment" above.
                  </td>
                </tr>
              ) : (
                services.map((srv) => (
                  <tr key={srv.id}>
                    <td style={{ fontWeight: 600 }}>{srv.name}</td>
                    <td>{srv.categoryName || 'Hair & Styling'}</td>
                    <td>
                      <Badge variant="primary">{srv.targetGender || 'ALL'}</Badge>
                    </td>
                    <td style={{ fontWeight: 700 }}>{formatINR(srv.basePrice || 0)}</td>
                    <td>{formatDuration(srv.durationMinutes || 30)}</td>
                    <td>
                      <Badge variant={srv.isActive !== false ? 'success' : 'warning'}>
                        {srv.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Edit2 size={12} />}
                        onClick={() => handleOpenEdit(srv)}
                      >
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

      {/* Edit Service Modal */}
      <Modal isOpen={isEditServiceOpen} onClose={() => setIsEditServiceOpen(false)} title={`Edit Treatment: ${selectedService?.name || ''}`}>
        <form onSubmit={handleUpdateService}>
          <Input
            label="Service / Treatment Name"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="e.g. Keratin Hair Spa & Treatment"
          />
          
          <Select
            label="Service Category"
            value={editCategoryId}
            onChange={(e) => setEditCategoryId(e.target.value)}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Base Price (INR)"
              type="number"
              required
              value={editBasePrice}
              onChange={(e) => setEditBasePrice(Number(e.target.value))}
            />
            <Input
              label="Duration (Minutes)"
              type="number"
              required
              value={editDurationMinutes}
              onChange={(e) => setEditDurationMinutes(Number(e.target.value))}
            />
          </div>

          <Select
            label="Target Audience / Gender"
            value={editTargetGender}
            onChange={(e) => setEditTargetGender(e.target.value as Gender)}
            options={[
              { value: Gender.FEMALE, label: 'Women' },
              { value: Gender.MALE, label: 'Men' },
              { value: Gender.OTHER, label: 'Unisex / All' },
            ]}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
            <input
              type="checkbox"
              id="serviceIsActive"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
              style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
            />
            <label htmlFor="serviceIsActive" style={{ fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
              Service is Active & Bookable by Clients
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <Button
              variant="danger"
              type="button"
              disabled={isSubmitting}
              onClick={handleDeleteService}
            >
              Delete Service
            </Button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button variant="secondary" type="button" onClick={() => setIsEditServiceOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Add Service Modal */}
      <Modal isOpen={isAddServiceOpen} onClose={() => setIsAddServiceOpen(false)} title="Create New Treatment Service">
        <form onSubmit={handleCreateService}>
          <Input label="Service / Treatment Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Keratin Hair Spa & Treatment" />
          
          <Select
            label="Service Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Base Price (INR)" type="number" required value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))} />
            <Input label="Duration (Minutes)" type="number" required value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} />
          </div>

          <Select
            label="Target Audience / Gender"
            value={targetGender}
            onChange={(e) => setTargetGender(e.target.value as Gender)}
            options={[
              { value: Gender.FEMALE, label: 'Women' },
              { value: Gender.MALE, label: 'Men' },
              { value: Gender.OTHER, label: 'Unisex / All' },
            ]}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsAddServiceOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Publishing...' : 'Publish Treatment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal isOpen={isAddCategoryOpen} onClose={() => setIsAddCategoryOpen(false)} title="Create Service Category">
        <form onSubmit={handleCreateCategory}>
          <Input label="Category Name" required value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="e.g. Hair Care, Skin & Facials, Massage" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsAddCategoryOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
