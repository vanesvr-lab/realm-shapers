-- B-011 scope 1: theme + sub-scene graph library. Worlds generated under the
-- new theme-driven landing flow store the picked theme id (e.g. "castle",
-- "forest") here so the renderer knows which sub-scene catalog to resolve
-- background_ids against. Old worlds keep theme = null and route through the
-- B-010 matcher fallback path silently.

alter table worlds add column if not exists theme text;

create index if not exists worlds_theme_idx on worlds(theme);
