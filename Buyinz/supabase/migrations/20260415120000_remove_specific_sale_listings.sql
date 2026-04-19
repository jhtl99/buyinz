-- One-time removal of specific sale listings (and related chat) by title.
-- Order matches public.delete_own_sale_listing: messages, conversations, posts.
-- user_ratings rows tied to those conversations are removed via ON DELETE CASCADE on conversations.

delete from public.messages
where conversation_id in (
  select c.id
  from public.conversations c
  inner join public.posts p on p.id = c.listing_id
  where p.type = 'sale'
    and p.title in ('A good boy', 'Beautiful Zachary Chud')
);

delete from public.conversations
where listing_id in (
  select id
  from public.posts
  where type = 'sale'
    and title in ('A good boy', 'Beautiful Zachary Chud')
);

delete from public.posts
where type = 'sale'
  and title in ('A good boy', 'Beautiful Zachary Chud');
