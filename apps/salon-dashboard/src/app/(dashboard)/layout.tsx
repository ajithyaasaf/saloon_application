'use client';

import React from 'react';
import { Sidebar } from '../../components/layout/Sidebar.js';
import { Header } from '../../components/layout/Header.js';
import { ProtectedRoute } from '../../components/layout/ProtectedRoute.js';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="dashboard-container">
        <Sidebar />
        <div className="dashboard-main">
          <Header />
          <main className="content-area">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
