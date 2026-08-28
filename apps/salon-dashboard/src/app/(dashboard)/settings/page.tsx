'use client';

import React, { useState } from 'react';
import { Building, Save, Shield } from 'lucide-react';
import { useSalon } from '../../../context/SalonContext.js';
import { Card } from '../../../components/ui/Card.js';
import { Button } from '../../../components/ui/Button.js';
import { Input } from '../../../components/ui/Input.js';

export default function SettingsPage() {
  const { salon } = useSalon();
  const [salonName, setSalonName] = useState(salon?.name || 'Glamour Luxe Unisex Salon');
  const [contactEmail, setContactEmail] = useState(salon?.contactEmail || 'contact@glamourluxe.com');
  const [contactPhone, setContactPhone] = useState(salon?.contactPhone || '+91 9876543210');
  const [gstin, setGstin] = useState(salon?.gstin || '29ABCDE1234F1Z5');
  const [pan, setPan] = useState(salon?.pan || 'ABCDE1234F');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Salon Brand & Tax Settings</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Configure enterprise brand details, legal business registration, GSTIN, and billing metadata
        </p>
      </div>

      <div style={{ maxWidth: '700px' }}>
        <Card title="Business Identity & Tax Registration">
          <form onSubmit={handleSave}>
            <Input label="Salon Brand Name" required value={salonName} onChange={(e) => setSalonName(e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input label="Contact Email" type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              <Input label="Contact Phone" required value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input label="GSTIN (15 characters)" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="29ABCDE1234F1Z5" />
              <Input label="Business PAN" value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} placeholder="ABCDE1234F" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              {isSaved && <span style={{ color: 'var(--success)', fontSize: '0.875rem', fontWeight: 600 }}>✓ Settings Saved</span>}
              <div style={{ marginLeft: 'auto' }}>
                <Button variant="primary" type="submit" leftIcon={<Save size={16} />}>
                  Save Settings
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
