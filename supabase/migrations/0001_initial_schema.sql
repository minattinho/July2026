-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ACCOUNTS
create table public.accounts (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  bank_name    text,
  account_type text not null default 'checking', -- checking | savings | credit | investment
  currency     text not null default 'BRL',
  color        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- CATEGORIES
create table public.categories (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete cascade, -- null = system default
  name       text not null,
  slug       text not null,
  color      text not null default '#6b7280',
  icon       text,
  type       text not null default 'expense', -- income | expense | both
  created_at timestamptz not null default now()
);

-- IMPORTS (track each file upload)
create table public.imports (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  account_id    uuid references public.accounts(id) on delete set null,
  file_name     text not null,
  file_type     text not null, -- 'ofx' | 'csv'
  status        text not null default 'pending', -- pending | done | error
  total_rows    integer,
  imported_rows integer,
  skipped_rows  integer,
  error_message text,
  created_at    timestamptz not null default now()
);

-- TRANSACTIONS
create table public.transactions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  account_id    uuid not null references public.accounts(id) on delete cascade,
  category_id   uuid references public.categories(id) on delete set null,
  import_id     uuid references public.imports(id) on delete set null,
  amount        numeric(15, 2) not null, -- positive = income, negative = expense
  type          text not null,           -- 'income' | 'expense' | 'transfer'
  description   text not null,
  notes         text,
  date          date not null,
  ofx_fitid     text,                    -- OFX unique ID for deduplication
  checknum      text,
  is_reconciled boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(account_id, ofx_fitid)          -- prevent duplicate OFX imports
);

-- Indexes for common query patterns
create index transactions_user_id_idx     on public.transactions(user_id);
create index transactions_account_id_idx  on public.transactions(account_id);
create index transactions_date_idx        on public.transactions(date desc);
create index transactions_category_id_idx on public.transactions(category_id);
create index transactions_type_idx        on public.transactions(type);

-- Updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger accounts_updated_at
  before update on public.accounts
  for each row execute function public.handle_updated_at();

create trigger transactions_updated_at
  before update on public.transactions
  for each row execute function public.handle_updated_at();
