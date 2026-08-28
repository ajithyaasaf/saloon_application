import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppButton } from '../components/ui/AppButton';
import { AppBadge } from '../components/ui/AppBadge';
import { AppCard } from '../components/ui/AppCard';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';

describe('Admin UI Primitives', () => {
  describe('AppButton', () => {
    it('renders text and handles clicks', () => {
      const onClick = jest.fn();
      render(<AppButton onClick={onClick}>Click Me</AppButton>);
      const btn = screen.getByRole('button', { name: /click me/i });
      fireEvent.click(btn);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('disables button when isLoading is true', () => {
      render(<AppButton isLoading>Submitting</AppButton>);
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
    });
  });

  describe('AppBadge', () => {
    it('renders with correct variant', () => {
      render(<AppBadge variant="success">Approved</AppBadge>);
      expect(screen.getByText('Approved')).toHaveClass('badge-success');
    });
  });

  describe('AppCard', () => {
    it('renders title and child content', () => {
      render(
        <AppCard title="System Telemetry" subtitle="Real-time connectivity">
          <div>Healthy</div>
        </AppCard>
      );
      expect(screen.getByText('System Telemetry')).toBeInTheDocument();
      expect(screen.getByText('Real-time connectivity')).toBeInTheDocument();
      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });
  });

  describe('StatCard', () => {
    it('renders title, value, and subtitle', () => {
      render(
        <StatCard
          title="Total Customers"
          value="12,500"
          subtitle="Active in platform CRM"
          variant="indigo"
        />
      );
      expect(screen.getByText('Total Customers')).toBeInTheDocument();
      expect(screen.getByText('12,500')).toBeInTheDocument();
      expect(screen.getByText('Active in platform CRM')).toBeInTheDocument();
    });
  });

  describe('EmptyState', () => {
    it('renders empty title and action button', () => {
      const onAction = jest.fn();
      render(
        <EmptyState
          title="No Salons Found"
          message="There are no pending salon applications."
          actionLabel="Refresh List"
          onAction={onAction}
        />
      );
      expect(screen.getByText('No Salons Found')).toBeInTheDocument();
      expect(screen.getByText('There are no pending salon applications.')).toBeInTheDocument();
      const btn = screen.getByRole('button', { name: /refresh list/i });
      fireEvent.click(btn);
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });
});
