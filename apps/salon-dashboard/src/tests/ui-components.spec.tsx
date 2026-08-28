import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { StatCard } from '../components/ui/StatCard.js';

describe('Salon Dashboard UI Primitives', () => {
  describe('Button', () => {
    it('should render button with children and primary variant', () => {
      render(<Button variant="primary">Click Me</Button>);
      const btn = screen.getByRole('button', { name: /Click Me/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveClass('btn-primary');
    });

    it('should disable button when isLoading is true', () => {
      render(<Button isLoading={true}>Processing</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
    });
  });

  describe('Card', () => {
    it('should render title and subtitle', () => {
      render(
        <Card title="Revenue Card" subtitle="Monthly report">
          <p>Card body content</p>
        </Card>
      );
      expect(screen.getByText('Revenue Card')).toBeInTheDocument();
      expect(screen.getByText('Monthly report')).toBeInTheDocument();
      expect(screen.getByText('Card body content')).toBeInTheDocument();
    });
  });

  describe('Badge', () => {
    it('should render with success variant', () => {
      render(<Badge variant="success">Active</Badge>);
      const badge = screen.getByText('Active');
      expect(badge).toHaveClass('badge-success');
    });
  });

  describe('StatCard', () => {
    it('should render label and formatted value', () => {
      render(<StatCard label="Today GMV" value="₹12,500" change="10% up" isPositive={true} />);
      expect(screen.getByText('Today GMV')).toBeInTheDocument();
      expect(screen.getByText('₹12,500')).toBeInTheDocument();
      expect(screen.getByText(/10% up/i)).toBeInTheDocument();
    });
  });
});
