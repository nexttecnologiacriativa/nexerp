-- Criar bucket para comprovantes
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

-- Criar políticas para o bucket de comprovantes
CREATE POLICY "Users can view their company receipts" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'receipts' 
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can upload their company receipts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'receipts' 
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their company receipts" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'receipts' 
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete their company receipts" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'receipts' 
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Adicionar colunas para arquivos nas tabelas
ALTER TABLE accounts_payable ADD COLUMN receipt_file_path text;
ALTER TABLE accounts_receivable ADD COLUMN receipt_file_path text;