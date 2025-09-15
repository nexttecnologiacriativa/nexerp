-- Primeiro, vamos atualizar qualquer registro que tenha campos nulos com valores temporários
UPDATE suppliers 
SET document = COALESCE(document, 'pending-' || id::text),
    email = COALESCE(email, 'pending-' || id::text || '@temp.com'),
    phone = COALESCE(phone, 'pending-' || id::text)
WHERE document IS NULL OR email IS NULL OR phone IS NULL;

-- Agora podemos tornar os campos obrigatórios
ALTER TABLE suppliers 
ALTER COLUMN document SET NOT NULL,
ALTER COLUMN email SET NOT NULL,
ALTER COLUMN phone SET NOT NULL;