-- Criar políticas RLS para permitir uploads e leitura pública no bucket 'restaurant-images'
-- Isso permite que a anon key (utilizada pelos scrapers locais) envie e gerencie as imagens.

CREATE POLICY "Permitir leitura publica de imagens" ON storage.objects
  FOR SELECT 
  TO public
  USING (bucket_id = 'restaurant-images');

CREATE POLICY "Permitir insercao publica de imagens" ON storage.objects
  FOR INSERT 
  TO public
  WITH CHECK (bucket_id = 'restaurant-images');

CREATE POLICY "Permitir atualizacao publica de imagens" ON storage.objects
  FOR UPDATE 
  TO public
  USING (bucket_id = 'restaurant-images');

CREATE POLICY "Permitir delecao publica de imagens" ON storage.objects
  FOR DELETE 
  TO public
  USING (bucket_id = 'restaurant-images');
