import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { History, Trash2, Clock, Loader2, AlertTriangle } from 'lucide-react';
import { loadUploadHistory, deleteUploadRecord, UploadRecord } from '@/utils/uploadHistory';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const UploadHistory: React.FC = () => {
  const [history, setHistory] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<UploadRecord | null>(null);

  const fetchHistory = useCallback(() => {
    setLoading(true);
    const data = loadUploadHistory();
    setHistory(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDeleteClick = (record: UploadRecord) => {
    setRecordToDelete(record);
    setIsAlertOpen(true);
  };

  const confirmDelete = () => {
    if (recordToDelete) {
      deleteUploadRecord(recordToDelete.id);
      fetchHistory(); // Recarrega a lista
      setIsAlertOpen(false);
      setRecordToDelete(null);
    }
  };
  
  const formatTimestamp = (timestamp: number) => {
    return format(new Date(timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  if (loading) {
    return (
      <Card className="p-6 shadow-soft-lg border-none rounded-xl bg-white dark:bg-gray-800 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-primary">Carregando histórico...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-soft-lg border-none rounded-xl bg-white dark:bg-gray-800">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
          <History className="h-6 w-6" /> Histórico de Uploads
        </CardTitle>
        <CardDescription className="text-gray-600">
          Registros de uploads em massa realizados nas Fases 1 a 4.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        {history.length === 0 ? (
          <Alert className="border-dashed text-center">
            <Clock className="h-4 w-4" />
            <AlertTitle>Nenhum registro encontrado</AlertTitle>
            <AlertDescription>
              O histórico de uploads será exibido aqui após a conclusão de cada fase.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {history.map((record) => (
              <div key={record.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl shadow-soft-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-primary truncate">
                    Fase {record.phase}: {record.successCount} itens processados
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {record.details}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {formatTimestamp(record.timestamp)}
                  </p>
                </div>
                <div className="flex space-x-2 shrink-0">
                  {/* A edição de um upload em massa é complexa, então a removemos por enquanto. */}
                  {/* <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50">
                    <Edit className="h-4 w-4" />
                  </Button> */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteClick(record)}
                    className="h-8 w-8 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      {/* Delete Alert Dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" /> Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir o registro de upload da Fase {recordToDelete?.phase} ({recordToDelete?.successCount} itens). 
              **Atenção:** Esta ação apenas remove o registro do histórico, **não desfaz as alterações no banco de dados.**
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir Registro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default UploadHistory;