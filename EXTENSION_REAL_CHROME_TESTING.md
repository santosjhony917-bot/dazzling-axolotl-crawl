# Teste real da extensão no Chrome

Notas para os próximos testes de Fase 1 / Validar IA.

## Contexto

O Chrome comum instalado na máquina (`Chrome/149`) pode abrir um perfil automatizado vazio e ignorar `--load-extension`, deixando `chrome://extensions` sem a extensão carregada. Isso já aconteceu nos testes do Validar IA e da Fase 1.

## Caminho que funcionou

Usar o Chrome for Testing baixado pelo Puppeteer, com janela visível e perfil fora da pasta do projeto:

```powershell
$chrome = "C:\Users\meuno\.cache\puppeteer\chrome\win64-149.0.7827.22\chrome-win64\chrome.exe"
$profile = Join-Path $env:TEMP "filterfood-campina-cft-profile-v1"
$ext = "C:\Users\meuno\Downloads\dazzling-axolotl-crawl-main\dazzling-axolotl-crawl-main\public\chrome-extension"

Start-Process -FilePath $chrome -ArgumentList @(
  "--remote-debugging-port=9224",
  "--user-data-dir=$profile",
  "--load-extension=$ext",
  "--disable-extensions-except=$ext",
  "--enable-extensions",
  "--no-first-run",
  "--no-default-browser-check",
  "--window-size=1540,960",
  "--window-position=40,30",
  "http://127.0.0.1:8080/admin/login"
)
```

Depois conectar via DevTools/Puppeteer em:

```text
http://127.0.0.1:9224
```

## Como confirmar que deu certo

Listar os targets de debug. Deve aparecer:

```text
chrome-extension://gnkcjgfhkbdhlnepniijcgadlbgdmaii/hybrid-background.js
```

Esse é o service worker correto da extensão `Coletor Auxiliar - Dazzling Axolotl`.

## Cuidados

- Não usar perfil de Chrome dentro de `.tmp` do projeto enquanto o Vite estiver rodando, porque o watcher pode tentar observar arquivos travados do Chrome e derrubar o dev server.
- Se `chrome://extensions` aparecer vazio, esse perfil não está com a extensão carregada e o teste não é válido.
- Login do painel admin: se o Chrome já preencher email e senha salvos, não digitar por cima. Apenas clicar em Entrar. Se o campo ficar contaminado por teste anterior, limpar/recarregar a tela antes de usar o autofill novamente.
