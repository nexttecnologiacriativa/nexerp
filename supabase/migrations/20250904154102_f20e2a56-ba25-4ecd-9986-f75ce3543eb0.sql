-- Popular sistema com dados fictícios realistas usando empresa existente
-- Usando a primeira empresa disponível

DO $$
DECLARE
    empresa_id uuid := '8fac7662-b0e2-4b0f-928a-a7023ecf948f';
BEGIN

-- 1. Criar categorias principais
INSERT INTO public.categories (company_id, name, description, color) VALUES
(empresa_id, 'Vendas', 'Receitas provenientes de vendas', '#10B981'),
(empresa_id, 'Serviços', 'Receitas de prestação de serviços', '#3B82F6'),
(empresa_id, 'Despesas Administrativas', 'Gastos com administração', '#EF4444'),
(empresa_id, 'Marketing', 'Investimentos em marketing e publicidade', '#8B5CF6'),
(empresa_id, 'Operacional', 'Custos operacionais do negócio', '#F59E0B'),
(empresa_id, 'Impostos', 'Tributos e impostos', '#6B7280');

-- 2. Criar subcategorias
INSERT INTO public.subcategories (company_id, category_id, name, description, color) VALUES
-- Vendas
(empresa_id, (SELECT id FROM categories WHERE name = 'Vendas' AND company_id = empresa_id), 'Produtos Físicos', 'Venda de produtos', '#059669'),
(empresa_id, (SELECT id FROM categories WHERE name = 'Vendas' AND company_id = empresa_id), 'Produtos Digitais', 'Venda de produtos digitais', '#0891B2'),
-- Serviços
(empresa_id, (SELECT id FROM categories WHERE name = 'Serviços' AND company_id = empresa_id), 'Consultoria', 'Serviços de consultoria', '#2563EB'),
(empresa_id, (SELECT id FROM categories WHERE name = 'Serviços' AND company_id = empresa_id), 'Desenvolvimento', 'Desenvolvimento de software', '#1D4ED8'),
-- Despesas Administrativas
(empresa_id, (SELECT id FROM categories WHERE name = 'Despesas Administrativas' AND company_id = empresa_id), 'Aluguel', 'Aluguel do escritório', '#DC2626'),
(empresa_id, (SELECT id FROM categories WHERE name = 'Despesas Administrativas' AND company_id = empresa_id), 'Utilidades', 'Energia, água, internet', '#B91C1C'),
-- Marketing
(empresa_id, (SELECT id FROM categories WHERE name = 'Marketing' AND company_id = empresa_id), 'Publicidade Online', 'Ads do Google, Facebook', '#7C3AED'),
(empresa_id, (SELECT id FROM categories WHERE name = 'Marketing' AND company_id = empresa_id), 'Material Gráfico', 'Folders, cartões, banners', '#6D28D9');

-- 3. Criar centros de custo
INSERT INTO public.cost_centers (company_id, name, description) VALUES
(empresa_id, 'Vendas', 'Centro de custo do departamento de vendas'),
(empresa_id, 'Marketing', 'Centro de custo do departamento de marketing'),
(empresa_id, 'Administrativo', 'Centro de custo administrativo'),
(empresa_id, 'TI', 'Centro de custo de tecnologia da informação'),
(empresa_id, 'Operações', 'Centro de custo operacional');

-- 4. Criar contas bancárias realistas
INSERT INTO public.bank_accounts (company_id, name, bank_name, account_number, account_type, balance) VALUES
(empresa_id, 'Conta Corrente Principal', 'Banco do Brasil', '12345-6', 'checking', 45780.50),
(empresa_id, 'Conta Poupança', 'Caixa Econômica Federal', '78901-2', 'savings', 25000.00),
(empresa_id, 'Conta Investimento', 'Itaú', '34567-8', 'investment', 120000.00),
(empresa_id, 'Conta Pagamentos', 'Bradesco', '90123-4', 'checking', 8950.75);

-- 5. Criar clientes realistas
INSERT INTO public.customers (company_id, name, email, phone, document, document_type, address, city, state, zip_code) VALUES
(empresa_id, 'Tech Solutions Ltda', 'contato@techsolutions.com.br', '(11) 3456-7890', '12.345.678/0001-90', 'cnpj', 'Av. Paulista, 1000', 'São Paulo', 'SP', '01310-100'),
(empresa_id, 'Maria Silva Consultoria', 'maria@consultoria.com.br', '(11) 9876-5432', '987.654.321-00', 'cpf', 'Rua Augusta, 500', 'São Paulo', 'SP', '01305-000'),
(empresa_id, 'Inovação Digital Ltda', 'contato@inovacaodigital.com.br', '(21) 2345-6789', '23.456.789/0001-01', 'cnpj', 'Rua do Ouvidor, 200', 'Rio de Janeiro', 'RJ', '20040-020'),
(empresa_id, 'João Santos ME', 'joao@santos.com.br', '(31) 8765-4321', '123.456.789-01', 'cpf', 'Av. Afonso Pena, 300', 'Belo Horizonte', 'MG', '30112-000'),
(empresa_id, 'Crescimento Empresarial S/A', 'comercial@crescimento.com.br', '(41) 3210-9876', '34.567.890/0001-12', 'cnpj', 'Rua XV de Novembro, 800', 'Curitiba', 'PR', '80020-310');

-- 6. Criar fornecedores realistas
INSERT INTO public.suppliers (company_id, name, email, phone, document, document_type, address, city, state, zip_code) VALUES
(empresa_id, 'Microsoft Brasil', 'vendas@microsoft.com.br', '(11) 3000-1000', '04.712.500/0001-07', 'cnpj', 'Av. das Nações Unidas, 12901', 'São Paulo', 'SP', '04578-000'),
(empresa_id, 'Google Cloud Brasil', 'suporte@google.com.br', '(11) 3000-2000', '06.990.590/0001-23', 'cnpj', 'Av. Brigadeiro Faria Lima, 3477', 'São Paulo', 'SP', '04538-133'),
(empresa_id, 'Energia Elétrica S/A', 'atendimento@energia.com.br', '(11) 0800-123456', '12.345.678/0001-23', 'cnpj', 'Rua da Energia, 100', 'São Paulo', 'SP', '01234-567'),
(empresa_id, 'Internet Fibra Ltda', 'comercial@fibra.com.br', '(11) 4000-5000', '23.456.789/0001-34', 'cnpj', 'Av. da Conectividade, 200', 'São Paulo', 'SP', '02345-678'),
(empresa_id, 'Material de Escritório Express', 'vendas@escritorio.com.br', '(11) 3500-6000', '34.567.890/0001-45', 'cnpj', 'Rua do Comércio, 300', 'São Paulo', 'SP', '03456-789');

END $$;