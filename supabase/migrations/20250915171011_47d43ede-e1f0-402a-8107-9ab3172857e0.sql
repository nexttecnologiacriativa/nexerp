-- First update any existing null emails with temporary values
UPDATE public.customers 
SET email = CONCAT('temp-email-', id, '@example.com')
WHERE email IS NULL;

-- Make email column NOT NULL
ALTER TABLE public.customers 
ALTER COLUMN email SET NOT NULL;