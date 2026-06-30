# Runbook: conexao Codex Chrome

Este projeto usa duas extensoes e um plugin diferentes:

1. Plugin Chrome do Codex
   - Cache: C:\Users\meuno\.codex\plugins\cache\openai-bundled\chrome
   - Nao editar manualmente.

2. Extensao Codex no Chrome
   - ID: hehggadaopoacecdllhhajmbjkdcmajg
   - Serve para a conexao visual Codex <-> Chrome.

3. Extensao Coletor Auxiliar
   - ID: kehbedmdplkodjgfiohgnebicblmhghe
   - Pasta fixa do projeto: C:\Users\meuno\Downloads\dazzling-axolotl-crawl-main\dazzling-axolotl-crawl-main\public\chrome-extension
   - Serve para o Validar IA.

## Regra principal

Nao tente desinstalar ou reinstalar o plugin Chrome do Codex enquanto a conexao visual estiver ativa ou enquanto existir a faixa: "Codex iniciou a depuracao deste navegador".

Quando a conexao esta ativa, o extension-host.exe pode ficar segurando arquivos do plugin. Isso causa "Falha ao desinstalar plugin".

Se aparecer "Falha ao desinstalar plugin", trate primeiro como host ativo segurando o cache, nao como cache quebrado. Rode `npm run guard:codex-chrome` antes de tentar reinstalar.

## Diagnostico normal

Use quando quiser saber se a instalacao esta saudavel:

```powershell
npm run check:codex-chrome
```

Se tudo estiver OK, nao rode comandos de fix durante uma sessao boa.

## Guardiao de conexao

Use quando quiser uma decisao rapida antes de mexer no Chrome:

```powershell
npm run guard:codex-chrome
```

Interpretacao principal:

- `CONNECTED`: o plugin do Codex esta integro e o `extension-host.exe` esta ativo. Use a conexao visual. Nao desinstale/reinstale o plugin agora.
- `READY_TO_CONNECT`: o plugin esta integro, mas o host visual nao esta ativo. Abra/conecte o Chrome pelo plugin do Codex.
- `BROKEN_INSTALL`: cache, manifesto ou registro estao quebrados. Repare antes de testar Validar IA.

Para monitorar enquanto trabalha:

```powershell
npm run watch:codex-chrome
```

Esse comando nao apaga cache e nao reinicia o Chrome. Ele so avisa quando a conexao mudou de estado.

## Antes de testar Validar IA com conexao visual

Rode sempre:

```powershell
npm run preflight:codex-chrome
```

Interpretacao:

- `PREFLIGHT OK` com host ativo: a conexao visual ja pode estar saudavel. Nao reinstale o plugin.
- `PREFLIGHT OK` sem host ativo: a instalacao esta integra, mas ainda falta conectar/depurar o Chrome pelo plugin.
- `PREFLIGHT FALHOU`: nao tente rodar Validar IA. Repare/reinstale primeiro.

O preflight valida a cadeia:

`latest -> extension-host.exe -> manifesto nativo -> HKCU -> extensao Codex`

Isso evita tratar cache quebrado como problema de captcha, memoria ou app.

## Antes de reinstalar/desinstalar o plugin Chrome do Codex

Primeiro rode:

```powershell
npm run check:codex-chrome-reinstall
```

Se bloquear por host ativo, rode:

```powershell
npm run hold:codex-chrome-reinstall
```

Enquanto esse comando estiver segurando o host desligado, faca a desinstalacao/reinstalacao no Codex.

## Recuperacao

Use quando quiser uma recuperacao segura:

```powershell
npm run fix:codex-chrome-lock
```

Esse comando nao encerra um host saudavel ativo. Se ele disser `CONEXAO SAUDAVEL`, nao reinstale o plugin; a conexao visual deve ser preservada.

Use somente quando voce realmente quiser derrubar a conexao visual ativa:

```powershell
npm run stop:codex-chrome-host
```

Se o cache do plugin estiver incompleto/quebrado:

```powershell
npm run repair:codex-chrome
```

## Para evitar nova queda

- Manter poucas abas abertas durante Validar IA.
- Fechar abas de chrome://extensions, Instagram, Google e Anota AI que nao estejam em uso.
- Nao misturar reload da extensao Coletor com reinstalacao do plugin Codex.
- Usar a pasta fixa do Coletor Auxiliar no Chrome: public/chrome-extension.
- Nao apagar arquivos dentro de .codex/plugins/cache manualmente.
- Nao rodar comandos que encerram o host enquanto a faixa "Codex iniciou a depuracao deste navegador" estiver ativa, exceto se for reinstalar de proposito.
