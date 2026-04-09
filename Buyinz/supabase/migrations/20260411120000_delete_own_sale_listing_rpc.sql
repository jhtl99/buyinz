-- Atomically delete a sale listing owned by the caller, plus related messages and conversations.
create or replace function public.delete_own_sale_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select user_id into v_owner
  from public.posts
  where id = p_listing_id and type = 'sale'
  for update;

  if not found then
    raise exception 'Listing not found';
  end if;

  if v_owner is distinct from auth.uid() then
    raise exception 'Not allowed';
  end if;

  delete from public.messages
  where conversation_id in (
    select id from public.conversations where listing_id = p_listing_id
  );

  delete from public.conversations
  where listing_id = p_listing_id;

  delete from public.posts
  where id = p_listing_id and type = 'sale';
end;
$$;

revoke all on function public.delete_own_sale_listing(uuid) from public;
grant execute on function public.delete_own_sale_listing(uuid) to authenticated;
