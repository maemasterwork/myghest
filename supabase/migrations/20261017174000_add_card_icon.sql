alter table public.cards
add column if not exists icon text;

notify pgrst, 'reload schema';
