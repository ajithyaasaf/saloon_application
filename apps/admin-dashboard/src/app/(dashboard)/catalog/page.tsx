'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminCatalogService } from '@/services/admin-domain.services';
import { ServiceCategoryDto, ServiceDto } from '@saloon/shared-types';
import { formatINR } from '@saloon/shared-utils';
import { DataTable, Column } from '@/components/ui/DataTable';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AppSelect } from '@/components/ui/AppSelect';
import { ActionModal } from '@/components/ui/ActionModal';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useToast } from '@/context/ToastContext';
import { Scissors, FolderPlus, Plus, Trash2, Edit } from 'lucide-react';

export default function CatalogPage() {
  const { success, danger } = useToast();
  const [categories, setCategories] = useState<ServiceCategoryDto[]>([]);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SERVICES' | 'CATEGORIES'>('SERVICES');
  const [search, setSearch] = useState('');

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceCategoryId, setServiceCategoryId] = useState('');
  const [serviceBasePrice, setServiceBasePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('45');
  const [serviceTargetGender, setServiceTargetGender] = useState('UNISEX');

  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCatalog = useCallback(async () => {
    setIsLoading(true);
    try {
      const [catRes, srvRes] = await Promise.all([
        adminCatalogService.getCategories(),
        adminCatalogService.getServices(),
      ]);
      setCategories(catRes);
      setServices(srvRes);
      if (catRes.length > 0 && !serviceCategoryId) {
        setServiceCategoryId(catRes[0].id);
      }
    } catch (err: any) {
      danger('Failed to load catalog', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [serviceCategoryId, danger]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) return;
    setActionLoading(true);
    try {
      await adminCatalogService.createCategory({
        name: categoryName.trim(),
        description: categoryDescription.trim() || undefined,
      });
      success('Category Created', 'Master category added to platform catalog.');
      setIsCategoryModalOpen(false);
      setCategoryName('');
      setCategoryDescription('');
      fetchCatalog();
    } catch (err: any) {
      danger('Failed to create category', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateService = async () => {
    if (!serviceName.trim() || !serviceBasePrice) return;
    setActionLoading(true);
    try {
      await adminCatalogService.createService({
        name: serviceName.trim(),
        categoryId: serviceCategoryId,
        basePrice: parseFloat(serviceBasePrice),
        durationMinutes: parseInt(serviceDuration, 10),
        targetGender: serviceTargetGender,
      });
      success('Master Service Created', 'Service definition registered in platform catalog.');
      setIsServiceModalOpen(false);
      setServiceName('');
      setServiceBasePrice('');
      fetchCatalog();
    } catch (err: any) {
      danger('Failed to create service', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteService = async () => {
    if (!deletingServiceId) return;
    setActionLoading(true);
    try {
      await adminCatalogService.deleteService(deletingServiceId);
      success('Service Deleted', 'Service removed from master catalog.');
      setDeletingServiceId(null);
      fetchCatalog();
    } catch (err: any) {
      danger('Deletion Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const serviceColumns: Column<ServiceDto>[] = [
    {
      key: 'name',
      header: 'Service Definition',
      render: (s) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-action-primary-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-action-primary)',
            }}
          >
            <Scissors size={18} />
          </div>
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
              {s.name}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Duration: {s.durationMinutes ?? 45} mins
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'basePrice',
      header: 'Master Base Price',
      render: (s) => (
        <span style={{ fontWeight: 600, color: 'var(--text-accent)' }}>
          {formatINR(s.basePrice ?? 0)}
        </span>
      ),
    },
    {
      key: 'targetGender',
      header: 'Target Gender',
      render: (s) => (
        <AppBadge variant="neutral">
          {s.targetGender || 'UNISEX'}
        </AppBadge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (s) => (
        <AppButton
          variant="danger"
          size="sm"
          onClick={() => setDeletingServiceId(s.id)}
          leftIcon={<Trash2 size={14} />}
        >
          Delete
        </AppButton>
      ),
    },
  ];

  const categoryColumns: Column<ServiceCategoryDto>[] = [
    {
      key: 'name',
      header: 'Category Name',
      render: (c) => <span style={{ fontWeight: 600 }}>{c.name}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (c) => <span style={{ color: 'var(--text-secondary)' }}>{c.description || '—'}</span>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Master Service Catalog</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Maintain global treatment categories, standard pricing baselines, and taxonomy
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <AppButton
            variant="secondary"
            size="sm"
            onClick={() => setIsCategoryModalOpen(true)}
            leftIcon={<FolderPlus size={14} />}
          >
            Add Category
          </AppButton>
          <AppButton
            variant="primary"
            size="sm"
            onClick={() => setIsServiceModalOpen(true)}
            leftIcon={<Plus size={14} />}
          >
            Add Master Service
          </AppButton>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.375rem' }}>
        <button
          onClick={() => setActiveTab('SERVICES')}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 600,
            border: '1px solid',
            borderColor: activeTab === 'SERVICES' ? 'var(--primary)' : 'var(--border-subtle)',
            backgroundColor: activeTab === 'SERVICES' ? 'var(--primary-light)' : 'transparent',
            color: activeTab === 'SERVICES' ? 'var(--text-accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          Master Services ({services.length})
        </button>
        <button
          onClick={() => setActiveTab('CATEGORIES')}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 600,
            border: '1px solid',
            borderColor: activeTab === 'CATEGORIES' ? 'var(--primary)' : 'var(--border-subtle)',
            backgroundColor: activeTab === 'CATEGORIES' ? 'var(--primary-light)' : 'transparent',
            color: activeTab === 'CATEGORIES' ? 'var(--text-accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          Categories ({categories.length})
        </button>
      </div>

      {activeTab === 'SERVICES' ? (
        <DataTable
          columns={serviceColumns}
          data={services.filter((s) => s.name?.toLowerCase().includes(search.toLowerCase()))}
          isLoading={isLoading}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search master services..."
        />
      ) : (
        <DataTable
          columns={categoryColumns}
          data={categories.filter((c) => c.name?.toLowerCase().includes(search.toLowerCase()))}
          isLoading={isLoading}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search categories..."
        />
      )}

      {/* Add Category Modal */}
      <ActionModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Add Master Service Category"
        footer={
          <>
            <AppButton variant="secondary" onClick={() => setIsCategoryModalOpen(false)}>
              Cancel
            </AppButton>
            <AppButton variant="primary" onClick={handleCreateCategory} isLoading={actionLoading}>
              Create Category
            </AppButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <AppInput
            label="Category Name *"
            placeholder="e.g., Hair Treatments, Facial & Skin"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
          />
          <AppInput
            label="Description"
            placeholder="Brief overview of category scope"
            value={categoryDescription}
            onChange={(e) => setCategoryDescription(e.target.value)}
          />
        </div>
      </ActionModal>

      {/* Add Service Modal */}
      <ActionModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        title="Add Master Service Definition"
        footer={
          <>
            <AppButton variant="secondary" onClick={() => setIsServiceModalOpen(false)}>
              Cancel
            </AppButton>
            <AppButton variant="primary" onClick={handleCreateService} isLoading={actionLoading}>
              Create Service
            </AppButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <AppInput
            label="Service Title *"
            placeholder="e.g., Signature Keratin Smoothing"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
          />
          <AppSelect
            label="Category *"
            value={serviceCategoryId}
            onChange={(e) => setServiceCategoryId(e.target.value)}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <AppInput
            label="Base Price (INR) *"
            type="number"
            placeholder="1500"
            value={serviceBasePrice}
            onChange={(e) => setServiceBasePrice(e.target.value)}
          />
          <AppInput
            label="Duration (Minutes)"
            type="number"
            placeholder="45"
            value={serviceDuration}
            onChange={(e) => setServiceDuration(e.target.value)}
          />
          <AppSelect
            label="Target Gender"
            value={serviceTargetGender}
            onChange={(e) => setServiceTargetGender(e.target.value)}
            options={[
              { value: 'UNISEX', label: 'Unisex (All Clients)' },
              { value: 'FEMALE', label: 'Female Only' },
              { value: 'MALE', label: 'Male Only' },
            ]}
          />
        </div>
      </ActionModal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={!!deletingServiceId}
        onClose={() => setDeletingServiceId(null)}
        onConfirm={handleDeleteService}
        title="Delete Service Definition"
        message="Are you sure you want to delete this master service? Salons offering this service will maintain existing historical bookings."
        confirmText="Delete Service"
        variant="danger"
        isLoading={actionLoading}
      />
    </div>
  );
}
