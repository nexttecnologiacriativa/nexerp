import React, { useState } from 'react';
import { Upload, X, File, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface FileUploadProps {
  onFileUploaded: (filePath: string) => void;
  currentFile?: string;
  companyId: string;
  accountId?: string;
}

export function FileUpload({ onFileUploaded, currentFile, companyId, accountId }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/${accountId || Date.now()}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      onFileUploaded(fileName);
      toast.success('Arquivo enviado com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async () => {
    if (!currentFile) return;

    try {
      const { error } = await supabase.storage
        .from('receipts')
        .remove([currentFile]);

      if (error) throw error;

      onFileUploaded('');
      toast.success('Arquivo removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover arquivo:', error);
      toast.error('Erro ao remover arquivo');
    }
  };

  const viewFile = async () => {
    if (!currentFile) return;

    try {
      const { data } = await supabase.storage
        .from('receipts')
        .createSignedUrl(currentFile, 60);

      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl);
      }
    } catch (error) {
      console.error('Erro ao visualizar arquivo:', error);
      toast.error('Erro ao visualizar arquivo');
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Comprovante</label>
      
      {currentFile ? (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
          <File className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-sm truncate">
            {currentFile.split('/').pop()}
          </span>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={viewFile}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              {previewUrl && (
                <iframe
                  src={previewUrl}
                  className="w-full h-96"
                  title="Visualização do arquivo"
                />
              )}
            </DialogContent>
          </Dialog>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={removeFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <div className="text-sm text-muted-foreground mb-2">
              Clique para enviar ou arraste o arquivo aqui
            </div>
            <input
              type="file"
              className="hidden"
              id="file-upload"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFile(file);
              }}
              disabled={uploading}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer"
            >
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                asChild
              >
                <span>
                  {uploading ? 'Enviando...' : 'Selecionar arquivo'}
                </span>
              </Button>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}