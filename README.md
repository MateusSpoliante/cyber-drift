# Cyber Drift 3D — F1 Time Attack

Jogo de corrida 3D em estilo time attack, desenvolvido com Three.js e Vite. Inclui sete circuitos inspirados em pistas de Fórmula 1, garagem e personalização, física veicular com Rapier, HUD, recordes e autenticação.

## Requisitos

- Node.js 20 ou superior
- npm
- Navegador com WebGL habilitado

## Executar localmente

```bash
npm install
npm run dev
```

Para gerar a versão de produção:

```bash
npm run build
npm run preview
```

A configuração de banco está em `.env.example`. Configure `DATABASE_URL` para habilitar autenticação, jogadores e ranking persistidos no PostgreSQL/Supabase. Sem banco configurado, os endpoints de conta e ranking não estarão disponíveis.

## Controles

| Ação | Teclas |
|---|---|
| Acelerar / frear / ré | W / S ou setas |
| Virar | A / D ou setas |
| Drift | Espaço |
| Nitro | Shift ou N |
| Trocar câmera | C |
| Recuperar o carro na pista | R |
| Reiniciar a volta | Tab |
| Pausar / voltar ao menu | Esc |

Ao perder o foco da janela ou mudar de aba, os comandos de direção, aceleração, freio, drift e nitro são liberados automaticamente.

## Estrutura do projeto

- `index.html`: estrutura da página, canvas e favicon.
- `src/main.js`: inicialização do jogo, interface, loop principal e integração dos sistemas.
- `src/styles.css`: estilos da interface e do HUD.
- `src/engine/`: física Rapier, controlador do veículo e efeitos visuais.
- `src/game/`: carro, câmera, circuitos e geometria das pistas.
- `api/`: funções serverless de autenticação, jogadores, recordes e saúde da API.
- `db/`: schema e migrações PostgreSQL.
- `public/`: recursos estáticos, incluindo favicon.
- `test/`: testes automatizados.

## Validação

`npm test` executa os testes automatizados disponíveis. `npm run build` valida a compilação de produção com Vite.

O build e os testes automatizados não substituem a validação do jogo em um navegador real, especialmente para física, colisões, WebGL e desempenho em diferentes GPUs.
