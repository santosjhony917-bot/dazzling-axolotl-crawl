-- Atualiza o nome dos perfis de proprietários de restaurantes para corresponder ao nome do restaurante.
-- Define o primeiro nome como o nome do restaurante e o sobrenome como vazio.
-- Isso corrige a exibição de "Usuário Anônimo" para restaurantes existentes.

UPDATE public.profiles
SET 
  first_name = restaurants.name,
  last_name = ''
FROM public.restaurants
WHERE public.profiles.id = public.restaurants.user_id;
