
create table wishlist_items (

  id integer primary key check (id > 0),
  name text not null unique check (name ~ '^[a-z0-9-]{1,100}$'),
  url text not null check (url ~ '^https://pokeapi\.co/api/v2/pokemon/\d+/?$'),
  added_at timestamptz not null default now()
);

create index wishlist_items_added_at on wishlist_items (added_at);

alter table wishlist_items enable row level security;
