# Alterações — Cyber Drift 3D

## Implementado nesta entrega

- Modal pós-volta com salvar, continuar e voltar ao menu.
- Identificação pseudônima por UUID persistido no navegador; sem cadastro, login, senha ou e-mail.
- Ranking global, diário, semanal e mensal.
- API Neon/Vercel para recordes, perfis públicos, garagens e fantasma.
- Perfis criados automaticamente no primeiro recorde.
- Garagem com preview 3D e personalização de carroceria, detalhes e rodas.
- Ghost Racing por trajetória amostrada durante a volta.
- Pontuação de drift e multiplicador de combo.
- Fallback local e fila de sincronização com identificador idempotente.
- Migração SQL para instalações que já tinham a tabela antiga de recordes.

## Ainda não implementado nesta entrega

- Multiplayer simultâneo em tempo real, salas, chat e encontros de pilotos.
- Login/recuperação de perfil em outro dispositivo (foi intencionalmente excluído do escopo).
- Antitrapaça robusto com física/cronômetro autoritativos no servidor.
- Modelos 3D adicionais, novas pistas, eventos, economia de itens e sistema completo de desafios/conquistas.

Esses itens exigem infraestrutura, assets e trabalho adicional; não devem ser considerados prontos apenas porque a arquitetura foi preparada para expansão.

## Ajustes de interface e circuito — 2026-11-17

- A garagem agora mostra uma confirmação visual explícita ao salvar personalizações, diferenciando salvamento online e local.
- Salvar um recorde não fecha mais a janela: a confirmação aparece dentro do modal, e ele permanece aberto até o jogador escolher **Menu Principal** ou **Continuar Correndo**.
- O botão de salvar é bloqueado após o sucesso para evitar envios repetidos do mesmo recorde.
- O circuito foi ampliado e redesenhado com retas significativamente mais longas, curvas rápidas e hairpins, mantendo o formato de pista fechada estilo Grand Prix.


## Compatibilidade com Supabase
- APIs migradas do driver Neon para `postgres` (PostgreSQL padrão).
- Conexão com SSL, uma conexão por instância serverless e prepared statements desativados para compatibilidade com pooler.
- `.env.example` e instruções atualizados para Supabase.


## Ranking por jogador
- O ranking mantém apenas o melhor tempo de cada jogador/dispositivo, atualizando a mesma linha em vez de criar entradas repetidas.
- A migração SQL remove duplicatas antigas por jogador e preserva o menor tempo.

## Supabase como banco principal — 2026-11-19

- Ao salvar um recorde, o jogo **sempre envia direto ao Supabase** (`POST /api/records`), sem depender de um estado "online" pré-detectado; até 3 tentativas com timeout.
- O `localStorage` deixou de ser um "banco local": serve apenas de cache de leitura do ranking e de fila de segurança.
- Se o banco estiver inacessível, o recorde entra numa fila (mesmo `clientRecordId`, sem duplicar) e é reenviado automaticamente ao voltar a conexão (evento `online`, a cada 30 s e ao abrir o jogo). A tela avisa claramente que o recorde está **pendente**, em vez de dizer que foi salvo.
- Erros de validação do servidor (4xx) são mostrados ao jogador e não entram na fila.
- O ranking local não é mais alterado de forma otimista: só mostra o que está no banco.
