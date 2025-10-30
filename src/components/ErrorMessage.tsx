import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md border-red-400 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center text-red-700">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Erro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorMessage;