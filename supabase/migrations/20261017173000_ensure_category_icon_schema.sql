alter table public.tx_categories
add column if not exists icon text;

notify pgrst, 'reload schema';
