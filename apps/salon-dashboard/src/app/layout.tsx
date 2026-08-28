import React from 'react';
import type { Metadata } from 'next';
import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext.js';
import { SalonProvider } from '../context/SalonContext.js';
import { ThemeProvider } from '../context/ThemeContext.js';

export const metadata: Metadata = {
  title: 'Saloon Partner Dashboard | Operating System for Indian Salons',
  description: 'Manage branches, appointments, staff shifts, service catalog, inventory, and revenue.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AuthProvider>
            <SalonProvider>{children}</SalonProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
