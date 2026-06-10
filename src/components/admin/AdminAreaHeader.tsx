import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings } from 'lucide-react';

interface AdminAreaHeaderProps {
  title: string;
  description?: string;
}

const AdminAreaHeader: React.FC<AdminAreaHeaderProps> = ({ title, description }) => {
  return (
    <Card className="shadow-none border-none rounded-2xl">
      <CardHeader>
        <CardTitle className="text-3xl text-primary">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
    </Card>
  );
};

export default AdminAreaHeader;