import React from 'react';
import { useParams } from 'react-router-dom';
import { CrmAdminTabs } from '@/pages/admin/crm/CrmWorkspace';

export default function CityCrm() {
  const { cityId } = useParams<{ cityId: string }>();
  return <CrmAdminTabs citySlug={cityId} />;
}
