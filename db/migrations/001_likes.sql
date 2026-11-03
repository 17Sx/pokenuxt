-- The Pokémon liked on the site. Like the wishlist, there are no accounts:
-- every visitor sees and changes the same likes.
create table likes (
  id integer primary key check (id > 0),
  name text not null unique check (name ~ '^[a-z0-9-]{1,100}$'),
  url text not null check (url ~ '^https://pokeapi\.co/api/v2/pokemon/\d+/?$'),
  liked_at timestamptz not null default now()
);

create index likes_liked_at on likes (liked_at);

alter table likes enable row level security;
