-- Popular sistema com dados fictícios realistas para uma pequena/média empresa

-- 1. Criar categorias principais
INSERT INTO public.categories (company_id, name, description, color) VALUES
(get_user_company_id(), 'Vendas', 'Receitas provenientes de vendas', '#10B981'),
(get_user_company_id(), 'Serviços', 'Receitas de prestação de serviços', '#3B82F6'),
(get_user_company_id(), 'Despesas Administrativas', 'Gastos com administração', '#EF4444'),
(get_user_company_id(), 'Marketing', 'Investimentos em marketing e publicidade', '#8B5CF6'),
(get_user_company_id(), 'Operacional', 'Custos operacionais do negócio', '#F59E0B'),
(get_user_company_id(), 'Impostos', 'Tributos e impostos', '#6B7280');

-- 2. Criar subcategorias
INSERT INTO public.subcategories (company_id, category_id, name, description, color) VALUES
-- Vendas
(get_user_company_id(), (SELECT id FROM categories WHERE name = 'Vendas' AND company_id = get_user_company_id()), 'Produtos Físicos', 'Venda de produtos', '#059669'),
(get_user_company_id(), (SELECT id FROM categories WHERE name = 'Vendas' AND company_id = get_user_company_id()), 'Produtos Digitais', 'Venda de produtos digitais', '#0891B2'),
-- Serviços
(get_user_company_id(), (SELECT id FROM categories WHERE name = 'Serviços' AND company_id = get_user_company_id()), 'Consultoria', 'Serviços de consultoria', '#2563EB'),
(get_user_company_id(), (SELECT id FROM categories WHERE name = 'Serviços' AND company_id = get_user_company_id()), 'Desenvolvimento', 'Desenvolvimento de software', '#1D4ED8'),
-- Despesas Administrativas
(get_user_company_id(), (SELECT id FROM categories WHERE name = 'Despesas Administrativas' AND company_id = get_user_company_id()), 'Aluguel', 'Aluguel do escritório', '#DC2626'),
(get_user_company_id(), (SELECT id FROM categories WHERE name = 'Despesas Administrativas' AND company_id = get_user_company_id()), 'Utilidades', 'Energia, água, internet', '#B91C1C'),
-- Marketing
(get_user_company_id(), (SELECT id FROM categories WHERE name = 'Marketing' AND company_id = get_user_company_id()), 'Publicidade Online', 'Ads do Google, Facebook', '#7C3AED'),
(get_user_company_id(), (SELECT id FROM categories WHERE name = 'Marketing' AND company_id = get_user_company_id()), 'Material Gráfico', 'Folders, cartões, banners', '#6D28D9');

-- 3. Criar centros de custo
INSERT INTO public.cost_centers (company_id, name, description) VALUES
(get_user_company_id(), 'Vendas', 'Centro de custo do departamento de vendas'),
(get_user_company_id(), 'Marketing', 'Centro de custo do departamento de marketing'),
(get_user_company_id(), 'Administrativo', 'Centro de custo administrativo'),
(get_user_company_id(), 'TI', 'Centro de custo de tecnologia da informação'),
(get_user_company_id(), 'Operações', 'Centro de custo operacional');

-- 4. Criar contas bancárias realistas
INSERT INTO public.bank_accounts (company_id, name, bank_name, account_number, account_type, balance) VALUES
(get_user_company_id(), 'Conta Corrente Principal', 'Banco do Brasil', '12345-6', 'checking', 45780.50),
(get_user_company_id(), 'Conta Poupança', 'Caixa Econômica Federal', '78901-2', 'savings', 25000.00),
(get_user_company_id(), 'Conta Investimento', 'Itaú', '34567-8', 'investment', 120000.00),
(get_user_company_id(), 'Conta Pagamentos', 'Bradesco', '90123-4', 'checking', 8950.75);

-- 5. Criar clientes realistas
INSERT INTO public.customers (company_id, name, email, phone, document, document_type, address, city, state, zip_code) VALUES
(get_user_company_id(), 'Tech Solutions Ltda', 'contato@techsolutions.com.br', '(11) 3456-7890', '12.345.678/0001-90', 'cnpj', 'Av. Paulista, 1000', 'São Paulo', 'SP', '01310-100'),
(get_user_company_id(), 'Maria Silva Consultoria', 'maria@consultoria.com.br', '(11) 9876-5432', '987.654.321-00', 'cpf', 'Rua Augusta, 500', 'São Paulo', 'SP', '01305-000'),
(get_user_company_id(), 'Inovação Digital Ltda', 'contato@inovacaodigital.com.br', '(21) 2345-6789', '23.456.789/0001-01', 'cnpj', 'Rua do Ouvidor, 200', 'Rio de Janeiro', 'RJ', '20040-020'),
(get_user_company_id(), 'João Santos ME', 'joao@santos.com.br', '(31) 8765-4321', '123.456.789-01', 'cpf', 'Av. Afonso Pena, 300', 'Belo Horizonte', 'MG', '30112-000'),
(get_user_company_id(), 'Crescimento Empresarial S/A', 'comercial@crescimento.com.br', '(41) 3210-9876', '34.567.890/0001-12', 'cnpj', 'Rua XV de Novembro, 800', 'Curitiba', 'PR', '80020-310');

-- 6. Criar fornecedores realistas
INSERT INTO public.suppliers (company_id, name, email, phone, document, document_type, address, city, state, zip_code) VALUES
(get_user_company_id(), 'Microsoft Brasil', 'vendas@microsoft.com.br', '(11) 3000-1000', '04.712.500/0001-07', 'cnpj', 'Av. das Nações Unidas, 12901', 'São Paulo', 'SP', '04578-000'),
(get_user_company_id(), 'Google Cloud Brasil', 'suporte@google.com.br', '(11) 3000-2000', '06.990.590/0001-23', 'cnpj', 'Av. Brigadeiro Faria Lima, 3477', 'São Paulo', 'SP', '04538-133'),
(get_user_company_id(), 'Energia Elétrica S/A', 'atendimento@energia.com.br', '(11) 0800-123456', '12.345.678/0001-23', 'cnpj', 'Rua da Energia, 100', 'São Paulo', 'SP', '01234-567'),
(get_user_company_id(), 'Internet Fibra Ltda', 'comercial@fibra.com.br', '(11) 4000-5000', '23.456.789/0001-34', 'cnpj', 'Av. da Conectividade, 200', 'São Paulo', 'SP', '02345-678'),
(get_user_company_id(), 'Material de Escritório Express', 'vendas@escritorio.com.br', '(11) 3500-6000', '34.567.890/0001-45', 'cnpj', 'Rua do Comércio, 300', 'São Paulo', 'SP', '03456-789');

-- 7. Criar produtos realistas
INSERT INTO public.products (company_id, name, description, sku, price, cost, stock_quantity, min_stock, unit, category_id) VALUES
(get_user_company_id(), 'Sistema ERP Premium', 'Sistema completo de gestão empresarial', 'ERP-001', 2500.00, 800.00, 100, 10, 'licença', (SELECT id FROM categories WHERE name = 'Vendas' AND company_id = get_user_company_id())),
(get_user_company_id(), 'Módulo Financeiro', 'Módulo adicional para controle financeiro', 'FIN-001', 800.00, 300.00, 50, 5, 'licença', (SELECT id FROM categories WHERE name = 'Vendas' AND company_id = get_user_company_id())),
(get_user_company_id(), 'Treinamento Online', 'Curso de capacitação em ERP', 'TRE-001', 450.00, 100.00, 200, 20, 'curso', (SELECT id FROM categories WHERE name = 'Serviços' AND company_id = get_user_company_id())),
(get_user_company_id(), 'Consultoria Especializada', 'Hora de consultoria técnica', 'CON-001', 150.00, 50.00, 1000, 100, 'hora', (SELECT id FROM categories WHERE name = 'Serviços' AND company_id = get_user_company_id())),
(get_user_company_id(), 'Suporte Técnico Mensal', 'Plano mensal de suporte técnico', 'SUP-001', 300.00, 80.00, 500, 50, 'mês', (SELECT id FROM categories WHERE name = 'Serviços' AND company_id = get_user_company_id()));

-- 8. Criar serviços realistas
INSERT INTO public.services (company_id, name, description, price, duration, category_id) VALUES
(get_user_company_id(), 'Implementação de ERP', 'Serviço completo de implementação do sistema ERP', 5000.00, 160, (SELECT id FROM categories WHERE name = 'Serviços' AND company_id = get_user_company_id())),
(get_user_company_id(), 'Consultoria em Processos', 'Análise e otimização de processos empresariais', 180.00, 2, (SELECT id FROM categories WHERE name = 'Serviços' AND company_id = get_user_company_id())),
(get_user_company_id(), 'Treinamento Presencial', 'Treinamento presencial para equipes', 1200.00, 8, (SELECT id FROM categories WHERE name = 'Serviços' AND company_id = get_user_company_id())),
(get_user_company_id(), 'Suporte Premium', 'Suporte técnico especializado 24/7', 800.00, 720, (SELECT id FROM categories WHERE name = 'Serviços' AND company_id = get_user_company_id())),
(get_user_company_id(), 'Auditoria de Sistema', 'Auditoria completa do sistema e processos', 2500.00, 40, (SELECT id FROM categories WHERE name = 'Serviços' AND company_id = get_user_company_id()));