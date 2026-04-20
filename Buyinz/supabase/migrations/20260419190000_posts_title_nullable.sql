-- Sale listing titles are optional (stores may omit).

alter table public.posts
  alter column title drop not null;

comment on column public.posts.title is 'Sale listing headline; NULL when omitted.';
