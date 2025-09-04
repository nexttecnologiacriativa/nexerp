-- Popular sistema com dados fictícios realistas - Segunda parte
DO $$
DECLARE
    empresa_id uuid := '8fac7662-b0e2-4b0f-928a-a7023ecf948f';
    categoria_vendas_id uuid;
    categoria_servicos_id uuid;
    categoria_despesas_id uuid;
    categoria_marketing_id uuid;
    categoria_operacional_id uuid;
    conta_corrente_id uuid;
    conta_poupanca_id uuid;
    cliente1_id uuid;
    cliente2_id uuid;
    fornecedor1_id uuid;
    fornecedor2_id uuid;
    centro_vendas_id uuid;
    centro_admin_id uuid;
BEGIN

-- 4. Criar contas bancárias com tipos válidos
INSERT INTO public.bank_accounts (company_id, name, bank_name, account_number, account_type, balance) VALUES
(empresa_id, 'Conta Corrente Principal', 'Banco do Brasil', '12345-6', 'checking', 45780.50),
(empresa_id, 'Conta Poupança', 'Caixa Econômica Federal', '78901-2', 'savings', 25000.00),
(empresa_id, 'Cartão Corporativo', 'Itaú', '34567-8', 'credit', -2500.00),
(empresa_id, 'Conta Pagamentos', 'Bradesco', '90123-4', 'checking', 8950.75)
RETURNING id INTO conta_corrente_id;

-- Buscar IDs das categorias criadas
SELECT id INTO categoria_vendas_id FROM categories WHERE name = 'Vendas' AND company_id = empresa_id;
SELECT id INTO categoria_servicos_id FROM categories WHERE name = 'Serviços' AND company_id = empresa_id;
SELECT id INTO categoria_despesas_id FROM categories WHERE name = 'Despesas Administrativas' AND company_id = empresa_id;
SELECT id INTO categoria_marketing_id FROM categories WHERE name = 'Marketing' AND company_id = empresa_id;
SELECT id INTO categoria_operacional_id FROM categories WHERE name = 'Operacional' AND company_id = empresa_id;

-- Buscar IDs dos centros de custo
SELECT id INTO centro_vendas_id FROM cost_centers WHERE name = 'Vendas' AND company_id = empresa_id;
SELECT id INTO centro_admin_id FROM cost_centers WHERE name = 'Administrativo' AND company_id = empresa_id;

-- Buscar conta corrente
SELECT id INTO conta_corrente_id FROM bank_accounts WHERE name = 'Conta Corrente Principal' AND company_id = empresa_id;
SELECT id INTO conta_poupanca_id FROM bank_accounts WHERE name = 'Conta Poupança' AND company_id = empresa_id;

-- 7. Criar produtos realistas
INSERT INTO public.products (company_id, name, description, sku, price, cost, stock_quantity, min_stock, unit, category_id) VALUES
(empresa_id, 'Sistema ERP Premium', 'Sistema completo de gestão empresarial', 'ERP-001', 2500.00, 800.00, 100, 10, 'licença', categoria_vendas_id),
(empresa_id, 'Módulo Financeiro', 'Módulo adicional para controle financeiro', 'FIN-001', 800.00, 300.00, 50, 5, 'licença', categoria_vendas_id),
(empresa_id, 'Treinamento Online', 'Curso de capacitação em ERP', 'TRE-001', 450.00, 100.00, 200, 20, 'curso', categoria_servicos_id),
(empresa_id, 'Consultoria Especializada', 'Hora de consultoria técnica', 'CON-001', 150.00, 50.00, 1000, 100, 'hora', categoria_servicos_id),
(empresa_id, 'Suporte Técnico Mensal', 'Plano mensal de suporte técnico', 'SUP-001', 300.00, 80.00, 500, 50, 'mês', categoria_servicos_id);

-- 8. Criar serviços realistas
INSERT INTO public.services (company_id, name, description, price, duration, category_id) VALUES
(empresa_id, 'Implementação de ERP', 'Serviço completo de implementação do sistema ERP', 5000.00, 160, categoria_servicos_id),
(empresa_id, 'Consultoria em Processos', 'Análise e otimização de processos empresariais', 180.00, 2, categoria_servicos_id),
(empresa_id, 'Treinamento Presencial', 'Treinamento presencial para equipes', 1200.00, 8, categoria_servicos_id),
(empresa_id, 'Suporte Premium', 'Suporte técnico especializado 24/7', 800.00, 720, categoria_servicos_id),
(empresa_id, 'Auditoria de Sistema', 'Auditoria completa do sistema e processos', 2500.00, 40, categoria_servicos_id);

-- Buscar alguns clientes e fornecedores
SELECT id INTO cliente1_id FROM customers WHERE name = 'Tech Solutions Ltda' AND company_id = empresa_id;
SELECT id INTO cliente2_id FROM customers WHERE name = 'Maria Silva Consultoria' AND company_id = empresa_id;
SELECT id INTO fornecedor1_id FROM suppliers WHERE name = 'Microsoft Brasil' AND company_id = empresa_id;
SELECT id INTO fornecedor2_id FROM suppliers WHERE name = 'Energia Elétrica S/A' AND company_id = empresa_id;

-- 9. Criar contas a receber (movimentações de entrada)
INSERT INTO public.accounts_receivable (company_id, customer_id, description, amount, due_date, payment_date, status, payment_method, bank_account_id, category_id) VALUES
(empresa_id, cliente1_id, 'Implementação Sistema ERP', 15000.00, '2024-12-15', '2024-12-10', 'paid', 'bank_transfer', conta_corrente_id, categoria_vendas_id),
(empresa_id, cliente2_id, 'Consultoria Janeiro 2024', 2400.00, '2024-01-31', '2024-01-28', 'paid', 'pix', conta_corrente_id, categoria_servicos_id),
(empresa_id, cliente1_id, 'Treinamento Equipe', 3600.00, '2024-11-30', '2024-11-25', 'paid', 'bank_transfer', conta_poupanca_id, categoria_servicos_id),
(empresa_id, cliente2_id, 'Suporte Técnico Dezembro', 1200.00, '2024-12-31', NULL, 'pending', 'pix', NULL, categoria_servicos_id),
(empresa_id, cliente1_id, 'Módulos Adicionais', 4800.00, '2025-01-15', NULL, 'pending', 'bank_transfer', NULL, categoria_vendas_id);

-- 10. Criar contas a pagar (movimentações de saída)
INSERT INTO public.accounts_payable (company_id, supplier_id, cost_center_id, description, amount, due_date, payment_date, status, payment_method, bank_account_id, category_id) VALUES
(empresa_id, fornecedor1_id, centro_admin_id, 'Licenças Microsoft 365', 1800.00, '2024-12-10', '2024-12-08', 'paid', 'bank_transfer', conta_corrente_id, categoria_operacional_id),
(empresa_id, fornecedor2_id, centro_admin_id, 'Conta de Energia Novembro', 850.00, '2024-11-25', '2024-11-20', 'paid', 'pix', conta_corrente_id, categoria_despesas_id),
(empresa_id, fornecedor1_id, centro_admin_id, 'Azure Cloud Services', 2400.00, '2024-12-15', '2024-12-12', 'paid', 'bank_transfer', conta_corrente_id, categoria_operacional_id),
(empresa_id, fornecedor2_id, centro_admin_id, 'Conta de Energia Dezembro', 920.00, '2024-12-25', NULL, 'pending', 'pix', NULL, categoria_despesas_id),
(empresa_id, fornecedor1_id, centro_admin_id, 'Renovação Licenças', 3200.00, '2025-01-10', NULL, 'pending', 'bank_transfer', NULL, categoria_operacional_id);

END $$;