-- Enable Row Level Security on all tables
alter table public.accounts     enable row level security;
alter table public.categories   enable row level security;
alter table public.imports      enable row level security;
alter table public.transactions enable row level security;

-- ACCOUNTS: users can only manage their own accounts
create policy "Users manage own accounts"
  on public.accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- CATEGORIES: users see their own + global system categories (user_id is null)
create policy "Users see own and system categories"
  on public.categories for select
  using (user_id = auth.uid() or user_id is null);

create policy "Users create own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "Users update own categories"
  on public.categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id);

-- IMPORTS: users can only manage their own imports
create policy "Users manage own imports"
  on public.imports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- TRANSACTIONS: users can only manage their own transactions
create policy "Users manage own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
