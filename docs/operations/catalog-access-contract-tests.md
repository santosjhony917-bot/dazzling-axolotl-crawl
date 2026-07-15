# Contrato de acesso do catálogo (0063/0064)

Este runbook valida RLS, grants, projeções públicas e RPCs das migrations 0063 e 0064 sem tocar no banco de produção. Os testes cobrem cinco personas: `anon`, cliente autenticado sem restaurante, proprietário, admin por `app_metadata` e `service_role`.

## Alerta de eficiência

| Método | Tempo típico | Custo | Confiabilidade | Escala | Risco operacional |
|---|---:|---:|---|---|---|
| Validador estático local | segundos | zero | detecta regressão textual, não executa PostgreSQL | alta em CI | não prova RLS/runtime |
| Supabase local com Docker | 5–15 min após baseline válido | zero | alta e repetível | alta em CI | indisponível nesta máquina; o histórico local não reconstrói o schema-base |
| Projeto/branch Supabase descartável | 15–30 min | custo do ambiente de staging | mais próxima do runtime real | alta | exige isolamento e credencial própria |
| Rodar no projeto de produção | rápido | zero incremental | tecnicamente alta | baixa | inaceitável: cria fixtures e depende de rollback/conexão |

Recomendação: validador estático em todo commit e pgTAP em um projeto/branch descartável construído a partir de um snapshot de schema pré-0063. Nunca usar `--linked` enquanto o link apontar para produção.

## Pré-condições bloqueantes

- O banco de teste precisa conter o schema imediatamente anterior à 0063. As migrations numéricas deste repositório começam alterando tabelas preexistentes; por isso `supabase db reset` não é, sozinho, um bootstrap confiável.
- O histórico de migrations local e o histórico remoto precisam estar reconciliados no ambiente descartável. Não usar `migration repair` no projeto de produção para contornar divergência.
- As roles Supabase `anon`, `authenticated` e `service_role`, o schema `auth` e pgTAP precisam existir. A conexão de teste precisa ser administrativa para alternar `SESSION AUTHORIZATION`; uma chave HTTP `service_role` não serve como URL PostgreSQL.
- A URL deve ser do banco descartável. Não salvar senha ou URL em arquivo versionado, histórico do shell ou saída de CI.

## 1. Validação estática (sem banco e sem Docker)

Na raiz do projeto:

```powershell
node scripts/validate-catalog-access-contract.mjs
```

O comando verifica transações, RLS obrigatório, funções `SECURITY DEFINER`, `search_path`, views, bounds das RPCs, revogação das RPCs legadas, ausência de dependência rígida de schema PostGIS e integridade lexical básica dos arquivos SQL. Ele não substitui a execução PostgreSQL.

## 2. Preparar um banco descartável

Use uma destas opções, na ordem de preferência:

1. Supabase Database Branch isolada do projeto, sem tráfego de usuários.
2. Projeto Supabase de staging descartável restaurado com um dump **somente de schema** pré-0063.
3. Supabase local, depois de adicionar um baseline completo e com Docker disponível.

Defina a URL apenas na sessão atual:

```powershell
$env:CATALOG_TEST_DB_URL = Read-Host "URL percent-encoded do banco DESCARTÁVEL"
```

Antes de continuar, confirme a identidade sem exibir credenciais:

```powershell
npx supabase projects list
```

Não execute `supabase test db --linked` neste fluxo. `--db-url` torna o alvo explícito e reduz o risco de usar o projeto errado.

## 3. Aplicar as migrations no ambiente descartável

Prefira o pipeline normal de migrations da branch/staging. Se o banco já representa o estado pré-0063, aplique **somente no ambiente descartável**, com parada no primeiro erro:

```powershell
npx supabase db push --db-url $env:CATALOG_TEST_DB_URL --dry-run
npx supabase db push --db-url $env:CATALOG_TEST_DB_URL
```

O `dry-run` deve listar 0063 e 0064 juntas. Se listar migrations anteriores, parar: o baseline/histórico não está alinhado. Não usar `--include-all` e não reparar histórico como atalho.

## 4. Executar pgTAP

```powershell
npx supabase test db --db-url $env:CATALOG_TEST_DB_URL supabase/tests/database/0063_0064_catalog_structure.test.sql
npx supabase test db --db-url $env:CATALOG_TEST_DB_URL supabase/tests/database/0063_0064_catalog_roles.test.sql
```

Os arquivos abrem uma transação, criam fixtures determinísticas, exercitam as roles e terminam com `ROLLBACK`. Ainda assim, só devem rodar em banco descartável: queda de conexão, timeout ou mudança futura no runner pode invalidar a suposição de rollback.

## 5. Critério de aprovação

A promoção é permitida somente se:

- o validador estático terminar com zero falhas;
- os dois arquivos pgTAP terminarem com zero falhas;
- não existir policy extra nos oito objetos protegidos;
- `anon` e `authenticated` não tiverem `TRUNCATE`, `TRIGGER` ou `REFERENCES`;
- views públicas mostrarem apenas os dois restaurantes auditados das fixtures;
- edição material do proprietário invalidar a auditoria e remover o restaurante da projeção pública;
- apenas admin/service role conseguirem restaurar aprovação ou alterar campos de sistema;
- as três RPCs públicas rejeitarem limites inválidos e executarem com dados elegíveis;
- consumidores públicos já tiverem migrado das tabelas/RPCs legadas para as projeções da 0064.

## 6. Limpeza

Destrua a branch/projeto descartável pelo painel ou processo de infraestrutura aprovado. Limpe a variável da sessão:

```powershell
Remove-Item Env:CATALOG_TEST_DB_URL
```

Não promova dados das fixtures. Descoberta, validação, coleta, estruturação, auditoria e publicação continuam fases separadas; um teste aprovado confirma o controle de acesso, não aprova restaurantes reais.
