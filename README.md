# Cyber Drift 3D — jogo de corrida com ranking online

## O que está implementado nesta versão

- Modal de recorde com **Menu Principal**, **Continuar Correndo** e **Salvar Recorde**; após salvar, a confirmação permanece visível no modal até o jogador escolher para onde ir.
- Confirmação visual de personalização salva na garagem, tanto no perfil online quanto localmente.
- Circuito Grand Prix ampliado, com retas mais longas, curvas rápidas e hairpins.
- Ranking online geral, diário, semanal e mensal (janelas móveis de 1, 7 e 30 dias).
- Identificação sem contas: o jogador não cria login, senha ou e-mail. O navegador gera um UUID aleatório e o mantém no `localStorage`; o apelido informado no primeiro recorde é associado a esse identificador.
- Perfis públicos com apelido, XP, nível, corridas e melhor tempo.
- Garagem com personalização de cor da carroceria e detalhes/rodas; as cores podem ser salvas no perfil online após o primeiro recorde.
- Ghost Racing: grava amostras da trajetória em cada volta e permite reproduzir o melhor fantasma disponível (global no servidor ou local no navegador).
- Pontuação de drift com combo visual.
- Fallback local com `localStorage` quando a API não está configurada/disponível, com fila de sincronização e identificador idempotente para reduzir duplicidades.
- API de recordes, perfis/garagem e fantasma em funções compatíveis com Vercel.

## Identificação sem login — limitações importantes

O UUID do navegador cria uma identidade pseudônima persistente naquele navegador. Não existe recuperação segura em outro dispositivo, outro navegador ou após apagar os dados locais. Apelidos não são prova de propriedade e podem ser repetidos por dispositivos diferentes. Não há autenticação nem proteção forte de identidade nesta versão.

## Configuração online

1. Crie um projeto PostgreSQL no Supabase.
2. Execute todo o arquivo `db/schema.sql` no SQL Editor do Supabase. O script também adiciona as colunas novas caso o banco já tenha a tabela `records` da versão anterior.
3. Publique o projeto em um repositório Git e importe-o na Vercel.
4. No Supabase, abra Connect e copie a URI PostgreSQL do Transaction Pooler. Configure-a como `DATABASE_URL` nas variáveis de ambiente da Vercel. Use a senha do banco no lugar de `SENHA`; não publique essa URI.
5. Faça o deploy.

## Desenvolvimento local

```bash
npm install
cp .env.example .env.local
# Preencha DATABASE_URL com a connection string PostgreSQL do Supabase (de preferência Transaction Pooler, com SSL).
npm run dev
```

Abrir apenas `index.html` diretamente funciona em modo local, mas não cria ranking compartilhado. Para testar API e banco, use `vercel dev`.

## Rotas

- `GET /api/records?period=all|daily|weekly|monthly`
- `POST /api/records` — recebe `name`, `timeMs`, `deviceId`, `clientRecordId` e amostras opcionais `ghost`.
- `GET /api/players` — lista perfis públicos.
- `GET /api/players?id=<uuid>` — consulta um perfil público.
- `PATCH /api/players` — salva cores somente se o `deviceId` corresponder ao navegador que criou o perfil.
- `GET /api/ghost` — retorna o fantasma válido mais rápido armazenado.

## Limitações e próximos passos

- O cronômetro e a física ainda rodam no navegador. Validar faixa de tempo e formato da telemetria não impede trapaças sofisticadas. Não classifique o ranking como competitivo/antifraude até implementar validação server-side mais forte.
- A identidade por UUID local é pseudônima, não uma conta protegida. Quem perder os dados do navegador perde o vínculo com o perfil.
- A garagem atual personaliza o modelo de carro existente. Modelos adicionais, pinturas avançadas, rodas distintas e itens desbloqueáveis exigem novos assets e lógica de desbloqueio.
- O Ghost Racing reproduz a trajetória registrada, mas ainda não sincroniza física autoritativa entre jogadores.
- Não há multiplayer em tempo real, salas, chat ou encontros simultâneos. Isso requer infraestrutura multiplayer/WebSocket e deve ser tratado como fase separada.
- Desafios, conquistas avançadas, eventos, múltiplas pistas e economia de itens ainda são expansões futuras.

## Segurança

Nunca coloque `DATABASE_URL` no HTML. As APIs validam entradas, usam consultas parametrizadas e limitam o tamanho da telemetria recebida. Para produção pública, acrescente rate limiting confiável, monitoramento e validação antitrapaça no servidor.
