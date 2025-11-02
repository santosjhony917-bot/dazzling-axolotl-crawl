import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { Separator } from '@/components/ui/separator';
import { createPageUrl } from '@/utils/url';
import { cn } from '@/lib/utils';

export default function AdminLayout() {
  return (
    <AdminPageLayout>
      <Outlet />
    </AdminPageLayout>
  );
}