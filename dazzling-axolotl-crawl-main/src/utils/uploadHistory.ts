import { showSuccess, showError } from "./toast";

export interface UploadRecord {
  id: string;
  timestamp: number;
  phase: number;
  successCount: number;
  details: string;
  error?: boolean;
  errors?: string[]; // Adicionado para armazenar mensagens de erro detalhadas
}

const HISTORY_KEY = 'admin_upload_history';

/**
 * Loads the upload history from localStorage.
 */
export function loadUploadHistory(): UploadRecord[] {
  try {
    const storedData = localStorage.getItem(HISTORY_KEY);
    if (storedData) {
      const data = JSON.parse(storedData) as UploadRecord[];
      // Garante que o histórico seja ordenado do mais recente para o mais antigo
      return data.sort((a, b) => b.timestamp - a.timestamp);
    }
  } catch (e) {
    console.error("Failed to load upload history:", e);
  }
  return [];
}

/**
 * Saves a new upload record to localStorage.
 */
export function saveUploadRecord(record: Omit<UploadRecord, 'id' | 'timestamp'>) {
  try {
    const newRecord: UploadRecord = {
      ...record,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    
    const history = loadUploadHistory();
    history.unshift(newRecord); // Adiciona no início
    
    // Limita o histórico a 50 registros
    const limitedHistory = history.slice(0, 50); 
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(limitedHistory));
    showSuccess(`Registro de upload da Fase ${record.phase} salvo.`);
  } catch (e) {
    showError("Falha ao salvar o registro de upload.");
    console.error("Failed to save upload record:", e);
  }
}

/**
 * Deletes a specific upload record by ID.
 */
export function deleteUploadRecord(id: string) {
  try {
    const history = loadUploadHistory();
    const updatedHistory = history.filter(record => record.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    showSuccess("Registro de upload excluído.");
    return updatedHistory;
  } catch (e) {
    showError("Falha ao excluir o registro de upload.");
    console.error("Failed to delete upload record:", e);
    return loadUploadHistory();
  }
}