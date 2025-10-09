import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user's company_id
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('User profile not found')
    }

    const companyId = profile.company_id

    // Insert Categories
    const { data: categories, error: catError } = await supabaseClient
      .from('categories')
      .insert([
        { company_id: companyId, name: 'Eletrônicos', description: 'Produtos eletrônicos', color: '#3B82F6' },
        { company_id: companyId, name: 'Móveis', description: 'Móveis e decoração', color: '#8B5CF6' },
        { company_id: companyId, name: 'Alimentos', description: 'Produtos alimentícios', color: '#10B981' },
        { company_id: companyId, name: 'Consultoria', description: 'Serviços de consultoria', color: '#F59E0B' },
      ])
      .select()

    if (catError) throw catError

    // Insert Subcategories
    if (categories && categories.length > 0) {
      await supabaseClient.from('subcategories').insert([
        { company_id: companyId, category_id: categories[0].id, name: 'Smartphones', color: '#60A5FA' },
        { company_id: companyId, category_id: categories[0].id, name: 'Notebooks', color: '#818CF8' },
        { company_id: companyId, category_id: categories[1].id, name: 'Cadeiras', color: '#A78BFA' },
        { company_id: companyId, category_id: categories[2].id, name: 'Bebidas', color: '#34D399' },
      ])
    }

    // Insert Cost Centers
    await supabaseClient.from('cost_centers').insert([
      { company_id: companyId, name: 'Administrativo', description: 'Despesas administrativas' },
      { company_id: companyId, name: 'Vendas', description: 'Despesas comerciais' },
      { company_id: companyId, name: 'TI', description: 'Tecnologia da informação' },
    ])

    // Insert Bank Accounts
    const { data: bankAccounts } = await supabaseClient
      .from('bank_accounts')
      .insert([
        { company_id: companyId, name: 'Conta Corrente Principal', bank_name: 'Banco do Brasil', account_number: '12345-6', account_type: 'checking', balance: 50000 },
        { company_id: companyId, name: 'Poupança', bank_name: 'Caixa Econômica', account_number: '78901-2', account_type: 'savings', balance: 25000 },
      ])
      .select()

    // Insert Customers
    const { data: customers } = await supabaseClient
      .from('customers')
      .insert([
        { company_id: companyId, name: 'João Silva Ltda', document: '12.345.678/0001-90', document_type: 'cnpj', email: 'joao@empresa.com', phone: '(11) 98765-4321', city: 'São Paulo', state: 'SP' },
        { company_id: companyId, name: 'Maria Santos', document: '123.456.789-00', document_type: 'cpf', email: 'maria@email.com', phone: '(21) 91234-5678', city: 'Rio de Janeiro', state: 'RJ' },
        { company_id: companyId, name: 'Tech Solutions SA', document: '98.765.432/0001-10', document_type: 'cnpj', email: 'contato@techsol.com', phone: '(11) 3456-7890', city: 'São Paulo', state: 'SP' },
      ])
      .select()

    // Insert Suppliers
    const { data: suppliers } = await supabaseClient
      .from('suppliers')
      .insert([
        { company_id: companyId, name: 'Fornecedor Tech Ltda', document: '11.222.333/0001-44', document_type: 'cnpj', email: 'vendas@forntech.com', phone: '(11) 2222-3333', city: 'Campinas', state: 'SP' },
        { company_id: companyId, name: 'Distribuidora ABC', document: '55.666.777/0001-88', document_type: 'cnpj', email: 'comercial@abc.com', phone: '(19) 3333-4444', city: 'Americana', state: 'SP' },
        { company_id: companyId, name: 'Serviços Online Ltda', document: '99.888.777/0001-66', document_type: 'cnpj', email: 'atendimento@servonline.com', phone: '(11) 4444-5555', city: 'São Paulo', state: 'SP' },
      ])
      .select()

    // Insert Products
    const { data: products } = await supabaseClient
      .from('products')
      .insert([
        { company_id: companyId, category_id: categories?.[0]?.id, name: 'Notebook Dell Inspiron', sku: 'DELL-NB-001', price: 3500, cost: 2800, stock_quantity: 15, min_stock: 5, unit: 'un' },
        { company_id: companyId, category_id: categories?.[0]?.id, name: 'Mouse Wireless Logitech', sku: 'LOG-MS-002', price: 89.90, cost: 60, stock_quantity: 50, min_stock: 10, unit: 'un' },
        { company_id: companyId, category_id: categories?.[1]?.id, name: 'Cadeira Ergonômica', sku: 'CAD-ERG-003', price: 899, cost: 650, stock_quantity: 8, min_stock: 3, unit: 'un' },
        { company_id: companyId, category_id: categories?.[2]?.id, name: 'Café Premium 500g', sku: 'CAF-PRE-004', price: 28.90, cost: 18, stock_quantity: 120, min_stock: 20, unit: 'un' },
      ])
      .select()

    // Insert Services
    await supabaseClient.from('services').insert([
      { company_id: companyId, category_id: categories?.[3]?.id, name: 'Consultoria em TI', description: 'Consultoria especializada em tecnologia', price: 250, duration: 60 },
      { company_id: companyId, category_id: categories?.[3]?.id, name: 'Desenvolvimento de Software', description: 'Desenvolvimento customizado', price: 150, duration: 60 },
      { company_id: companyId, category_id: categories?.[3]?.id, name: 'Suporte Técnico', description: 'Suporte técnico especializado', price: 100, duration: 30 },
    ])

    // Insert Sales
    if (customers && customers.length > 0 && products && products.length > 0) {
      const { data: sales } = await supabaseClient
        .from('sales')
        .insert([
          { company_id: companyId, customer_id: customers[0].id, sale_number: 'VD-2025-001', sale_date: '2025-01-15', total_amount: 3589.90, discount_amount: 0, net_amount: 3589.90, payment_method: 'pix', status: 'active' },
          { company_id: companyId, customer_id: customers[1].id, sale_number: 'VD-2025-002', sale_date: '2025-01-20', total_amount: 899, discount_amount: 50, net_amount: 849, payment_method: 'credit_card', status: 'active' },
        ])
        .select()

      // Insert Sale Items
      if (sales && sales.length > 0) {
        await supabaseClient.from('sale_items').insert([
          { sale_id: sales[0].id, product_id: products[0].id, description: 'Notebook Dell Inspiron', quantity: 1, unit_price: 3500, total_price: 3500 },
          { sale_id: sales[0].id, product_id: products[1].id, description: 'Mouse Wireless Logitech', quantity: 1, unit_price: 89.90, total_price: 89.90 },
          { sale_id: sales[1].id, product_id: products[2].id, description: 'Cadeira Ergonômica', quantity: 1, unit_price: 899, total_price: 899 },
        ])
      }
    }

    // Insert Accounts Receivable
    if (customers && bankAccounts) {
      await supabaseClient.from('accounts_receivable').insert([
        { company_id: companyId, customer_id: customers[0]?.id, description: 'Venda produtos eletrônicos', amount: 3589.90, due_date: '2025-02-15', payment_method: 'pix', bank_account_id: bankAccounts[0]?.id, status: 'pending' },
        { company_id: companyId, customer_id: customers[1]?.id, description: 'Venda móveis', amount: 849, due_date: '2025-02-01', payment_method: 'credit_card', bank_account_id: bankAccounts[0]?.id, status: 'paid', payment_date: '2025-01-25' },
        { company_id: companyId, customer_id: customers[2]?.id, description: 'Serviço de consultoria', amount: 1500, due_date: '2025-02-28', payment_method: 'bank_transfer', bank_account_id: bankAccounts[0]?.id, status: 'pending' },
      ])
    }

    // Insert Accounts Payable
    if (suppliers && bankAccounts) {
      await supabaseClient.from('accounts_payable').insert([
        { company_id: companyId, supplier_id: suppliers[0]?.id, description: 'Compra de estoque', amount: 15000, due_date: '2025-02-10', payment_method: 'bank_transfer', bank_account_id: bankAccounts[0]?.id, status: 'pending' },
        { company_id: companyId, supplier_id: suppliers[1]?.id, description: 'Fornecimento mensal', amount: 5000, due_date: '2025-01-30', payment_method: 'pix', bank_account_id: bankAccounts[0]?.id, status: 'paid', payment_date: '2025-01-28' },
        { company_id: companyId, supplier_id: suppliers[2]?.id, description: 'Serviço de hospedagem', amount: 299, due_date: '2025-02-05', payment_method: 'credit_card', status: 'pending' },
      ])
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Dados de demonstração inseridos com sucesso!',
        summary: {
          categories: 4,
          subcategories: 4,
          cost_centers: 3,
          bank_accounts: 2,
          customers: 3,
          suppliers: 3,
          products: 4,
          services: 3,
          sales: 2,
          accounts_receivable: 3,
          accounts_payable: 3
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
