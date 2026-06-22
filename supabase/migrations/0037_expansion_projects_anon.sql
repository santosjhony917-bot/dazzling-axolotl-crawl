-- Permite que usuários anônimos (painel local) possam ler, inserir e atualizar na tabela expansion_projects
CREATE POLICY "Allow public access for expansion_projects"
  ON expansion_projects
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
