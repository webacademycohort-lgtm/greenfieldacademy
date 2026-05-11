-- Greenfield Academy seed data for the static portal schema

insert into public.classes (name, level) values
  ('JSS1A','JSS'),
  ('JSS1B','JSS'),
  ('JSS2A','JSS'),
  ('JSS3A','JSS'),
  ('SS1A','SSS'),
  ('SS1B','SSS'),
  ('SS2A','SSS'),
  ('SS3A','SSS')
on conflict (name) do nothing;

insert into public.subjects (name, code) values
  ('English Language','ENG'),
  ('Mathematics','MTH'),
  ('Biology','BIO'),
  ('Physics','PHY'),
  ('Chemistry','CHM'),
  ('Civic Education','CIV'),
  ('Economics','ECO'),
  ('Literature','LIT'),
  ('History','HIS'),
  ('Yoruba','YOR')
on conflict (code) do nothing;

insert into public.blog_posts (title, slug, cover, excerpt, body, author, published_at)
values
  (
    'Greenfield Wins Lagos Inter-School Debate 2025',
    'debate-2025',
    'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=900',
    'Our seniors lifted the trophy after a fierce final against 12 schools.',
    'Full story...',
    'Admin',
    now()
  )
on conflict (slug) do nothing;
