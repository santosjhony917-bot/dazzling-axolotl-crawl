import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings } from 'lucide-react';

interface AdminAreaHeaderProps {
  title: string;
  description?: string;
}

const AdminAreaHeader: React.FC<AdminAreaHeaderProps> = ({ title, description }) => {
  return (
    <Card className="shadow-lg border-none rounded-xl">
      <CardHeader>
        <CardTitle className="text-3xl text-[#022D68]">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
    </Card>
  );
};

export default AdminAreaHeader;