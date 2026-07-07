# FilterFood commercial

Comercial 16:9 de 10 segundos em 1080p para o FilterFood, usando assets reais do projeto:

- `public/assets/filterfood-logo.png`
- `public/images/filterfood_combo_food.png`
- `public/images/filterfood_compare_table.png`
- `public/images/filterfood_price_search.png`

Identidade usada: Poppins, laranja `#C45116`, roxo `#5D3DBD`, fundo `#FAFAFA`, texto `#2A2A2A`.

## Renderizar

```bash
node marketing/render-filterfood-commercial.cjs
```

Se o projeto nao tiver FFmpeg instalado no PATH, instale o binario local:

```bash
npm install --no-save ffmpeg-static
node marketing/render-filterfood-commercial.cjs
```

Saida esperada:

```text
marketing/filterfood-commercial-10s.mp4
```

O script gera tambem frames PNG em `marketing/frames/`. A trilha e sintetica e livre de direitos autorais, criada por FFmpeg com tom base e efeitos leves de clique.
