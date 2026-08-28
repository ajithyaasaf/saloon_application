import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, Column } from '../components/ui/DataTable';

interface TestItem {
  id: string;
  name: string;
  role: string;
}

describe('DataTable Component', () => {
  const columns: Column<TestItem>[] = [
    { key: 'name', header: 'Name' },
    { key: 'role', header: 'Role' },
  ];

  const data: TestItem[] = [
    { id: '1', name: 'Alice Admin', role: 'SUPER_ADMIN' },
    { id: '2', name: 'Bob Stylist', role: 'SALON_STAFF' },
  ];

  it('renders table headers and rows accurately', () => {
    render(<DataTable columns={columns} data={data} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    expect(screen.getByText('SUPER_ADMIN')).toBeInTheDocument();
    expect(screen.getByText('Bob Stylist')).toBeInTheDocument();
  });

  it('renders empty state when data is empty', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyTitle="No records"
        emptyMessage="Nothing here"
      />
    );

    expect(screen.getByText('No records')).toBeInTheDocument();
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('handles search input change', () => {
    const onSearch = jest.fn();
    render(
      <DataTable
        columns={columns}
        data={data}
        searchValue="Alice"
        onSearchChange={onSearch}
        searchPlaceholder="Filter items..."
      />
    );

    const input = screen.getByPlaceholderText('Filter items...');
    expect(input).toHaveValue('Alice');

    fireEvent.change(input, { target: { value: 'Bob' } });
    expect(onSearch).toHaveBeenCalledWith('Bob');
  });

  it('handles pagination next and previous buttons', () => {
    const onPageChange = jest.fn();
    render(
      <DataTable
        columns={columns}
        data={data}
        meta={{
          total: 25,
          page: 2,
          limit: 10,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        }}
        onPageChange={onPageChange}
      />
    );

    const prevBtn = screen.getByRole('button', { name: /previous/i });
    const nextBtn = screen.getByRole('button', { name: /next/i });

    fireEvent.click(prevBtn);
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
