# Cyber Drift — estrutura do projeto

## Tecnologias

- **Vite** para desenvolvimento, build e otimização dos arquivos estáticos.
- **Three.js** como dependência npm, com import ES Module (sem depender de uma cópia global via CDN).
- **JavaScript ES Modules** para separar responsabilidades sem reescrever a simulação inteira.
- **Vercel Functions** em `api/` e PostgreSQL para autenticação, jogadores, tempos e ghosts.

## Organização

```
api/                         # endpoints serverless
db/                          # schema e migrações SQL
src/
  main.js                    # inicialização e integração do jogo
  styles.css                 # estilos da interface
  game/
    track/
      trackGeometry.js       # malhas contínuas de asfalto, brita, zebras e barreiras
index.html                   # shell da aplicação
dist/                        # build gerado pelo Vite (não versionar)
```

## Comandos

- `npm install`: instala as dependências.
- `npm run dev`: inicia o Vite para desenvolvimento visual.
- `npm run build`: gera a versão de produção em `dist/`.
- `npm run preview`: testa localmente o build de produção.
- `npm run vercel:dev`: inicia o ambiente local da Vercel, incluindo as funções de `api/`.

A API continua na pasta raiz `api/`; o build do Vite publica apenas o frontend em `dist/`.
