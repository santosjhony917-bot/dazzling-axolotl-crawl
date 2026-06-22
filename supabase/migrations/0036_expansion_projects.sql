CREATE TABLE IF NOT EXISTS expansion_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'Planejamento',
  manager_name TEXT,
  progress INTEGER DEFAULT 0,
  health_score INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE expansion_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access for authenticated users on expansion_projects"
  ON expansion_projects
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
