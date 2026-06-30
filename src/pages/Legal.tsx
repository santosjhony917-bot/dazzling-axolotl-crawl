import React from 'react';
import LegalContent from '@/components/LegalContent';
import PhoneShell from '@/components/layout/PhoneShell';

export default function Legal() {
  return (
    <PhoneShell shellClassName="relative font-sans antialiased flex flex-col">
        <LegalContent />
    </PhoneShell>
  );
}
