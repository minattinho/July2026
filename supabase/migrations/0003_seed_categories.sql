-- Seed default/system categories (user_id = null means available to all users)
insert into public.categories (id, user_id, name, slug, color, icon, type) values
  -- Income categories
  (uuid_generate_v4(), null, 'Salário',         'salario',        '#22c55e', 'briefcase',        'income'),
  (uuid_generate_v4(), null, 'Freelance',        'freelance',      '#16a34a', 'laptop',           'income'),
  (uuid_generate_v4(), null, 'Investimentos',    'investimentos',  '#0ea5e9', 'trending-up',      'income'),
  (uuid_generate_v4(), null, 'Outros Recebidos', 'outros-rec',     '#84cc16', 'plus-circle',      'income'),
  -- Expense categories
  (uuid_generate_v4(), null, 'Alimentação',      'alimentacao',    '#f97316', 'utensils',         'expense'),
  (uuid_generate_v4(), null, 'Transporte',       'transporte',     '#8b5cf6', 'car',              'expense'),
  (uuid_generate_v4(), null, 'Moradia',          'moradia',        '#ec4899', 'home',             'expense'),
  (uuid_generate_v4(), null, 'Saúde',            'saude',          '#ef4444', 'heart-pulse',      'expense'),
  (uuid_generate_v4(), null, 'Lazer',            'lazer',          '#f59e0b', 'tv',               'expense'),
  (uuid_generate_v4(), null, 'Compras',          'compras',        '#06b6d4', 'shopping-bag',     'expense'),
  (uuid_generate_v4(), null, 'Educação',         'educacao',       '#6366f1', 'book-open',        'expense'),
  (uuid_generate_v4(), null, 'Contas e Serviços','contas',         '#84cc16', 'zap',              'expense'),
  (uuid_generate_v4(), null, 'Assinaturas',      'assinaturas',    '#a855f7', 'repeat',           'expense'),
  -- Both
  (uuid_generate_v4(), null, 'Transferência',    'transferencia',  '#94a3b8', 'arrow-right-left', 'both'),
  (uuid_generate_v4(), null, 'Outros',           'outros',         '#6b7280', 'circle',           'both');
