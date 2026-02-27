-- Create instances table
create table if not exists instances (
  id text primary key,
  name text not null,
  icon text,
  logo text,
  loader text,
  version text,
  modpack_url text,
  discord text,
  website text,
  description text,
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table instances enable row level security;

-- Create policy to allow read access to everyone (public API)
create policy "Public instances are viewable by everyone"
  on instances for select
  using (true);

-- Create policy to allow write access only to authenticated users (admin dashboard)
-- For simplicity, we assume the API handles authentication and uses the service_role key for writes,
-- or we can use Supabase Auth policies if we integrate Supabase Auth directly.
-- Since we are using NextAuth and a custom backend API route, we will likely use the service_role key on the server side
-- or check the user session before performing operations.
-- However, if we want to enforce RLS based on Supabase Auth (which we might not use directly if using NextAuth),
-- we can keep it simple for now or rely on the backend check.

-- For now, let's allow insert/update/delete for authenticated users via service_role or similar.
-- Actually, if we use Supabase Client with Anon Key on client-side, we need RLS.
-- But we are building an Admin Dashboard. We should do all writes via API routes (Server-Side) using Service Role Key
-- OR use Supabase Auth.
-- The prompt says "Login Discord". NextAuth is easier for Discord.
-- So we will use NextAuth for authentication, and the backend API routes will verify the session.
-- The backend will use `supabase-js` with `SERVICE_ROLE_KEY` to bypass RLS for writes,
-- or we can just set RLS to allow all for now if we trust the API layer.
-- Let's set RLS to allow read public, write authenticated (if we were using Supabase Auth).
-- Since we use NextAuth, the database doesn't know about the user.
-- So we will use the Service Role Key in our API routes to perform writes.
-- The RLS for select is fine (public).
