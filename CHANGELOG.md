## Correções de pistas, brita e garagem — 2026-11-19

- Restaurada a interpolação centrípeta dos circuitos para evitar overshoot em curvas fechadas.
- Bordas do asfalto, zebras e barreiras usam normais de deslocamento com miter limitado para reduzir cruzamentos e picos na geometria.
- Adicionada faixa visual de brita dos dois lados da pista.
- A brita aplica resistência elevada ao rolamento e reduz a velocidade progressivamente, sem travamento instantâneo.
- A lista de garagens públicas mostra somente o perfil mais recentemente atualizado para cada nome de piloto, preservando as cores do último carro salvo nesse perfil.

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

## Nitro, fantasma e desempenho — 2026-11-19

- Carro fantasma não aparece mais na pista (a telemetria continua sendo gravada e enviada ao banco).
- Nitro: ao esvaziar, superaquece por 2,5 s (sem uso e sem recarga); depois exige 25% de carga e soltar/apertar a tecla para reacender. Há 0,9 s sem recarga após soltar o nitro, o que impede "pulsar" a tecla para recarregar. O HUD mostra superaquecimento, carregando e pronto.
- Desempenho: pixel ratio limitado a 1,5 e sombras PCF simples.


## Cyber Drift 3D — atualização de produto

- Adicionado cadastro/login com senha derivada por `scrypt`, salt aleatório e token HMAC expirável.
- Adicionado `(não é necessário configurar segredo de autenticação)` e documentação de configuração.
- Adicionados quatro circuitos com dificuldade, escala e cenários distintos.
- Rankings, recordes e fantasmas agora consultam `track_id`.
- Adicionado retorno direto da garagem de outro jogador para a garagem pessoal.
- HUD simplificado, com menos telemetria concorrendo com a direção.
- Cronômetro e amostragem do fantasma começam no primeiro comando de aceleração.
- API de recordes exige sessão autenticada e associa a volta à conta do jogador.
- Incluída migração SQL independente para banco existente.

- Configuração de `scrypt` ajustada para N=2^14, r=8, p=5, seguindo uma das configurações alternativas indicadas pela OWASP para equilibrar custo de memória e CPU.
- Sessão migrada para cookie `HttpOnly`/`SameSite=Lax` (e `Secure` em produção), evitando expor o token ao JavaScript e removendo o token legado do `localStorage`.
- Recorde pessoal exibido na garagem agora acompanha o circuito selecionado; o melhor tempo de uma pista não é comparado com tempos de outra.
- Cenários ampliados: formações rochosas/dunas no deserto, montanhas nevadas nos Alpes e contêineres no porto.
- Recursos WebGL antigos são descartados ao trocar de circuito, com deduplicação de geometrias, materiais e texturas compartilhados.

## Circuitos reais, física progressiva e otimização — 2026-11-19

- Substituídos os sete traçados genéricos por linhas centrais geográficas baseadas nos layouts de Monza, Interlagos, Marina Bay, Silverstone, Spa-Francorchamps, Suzuka e Mônaco. Cada circuito mantém proporção e sequência de curvas próprias; Suzuka preserva o desenho característico em oito.
- Largura de pista e afastamento das barreiras ajustados individualmente, mantendo pistas urbanas estreitas e áreas laterais maiores nos autódromos permanentes.
- Aceleração progressiva, entrega de torque decrescente com a velocidade, resistência aerodinâmica e frenagem gradual. A velocidade excedente do ERS diminui naturalmente ao terminar o boost.
- HUD e minimapa atualizados em frequências menores, sem reduzir a frequência da simulação, câmera ou renderização.
- Resolução do mapa de sombras reduzida para aliviar a GPU.
- O gerador original de zebras e barreiras foi mantido para preservar compatibilidade com a versão Three.js já usada pelo projeto.
- Incluída atribuição e licença dos dados geográficos dos circuitos em `THIRD_PARTY_NOTICES.md`.

### Correção de inicialização — 2026-11-19

- Removida a substituição do gerador de elementos da pista por malhas instanciadas, que introduzia uma falha de compatibilidade durante a montagem do mundo em algumas execuções.
- Restaurado o modo de interpolação original do projeto; os novos pontos geográficos e as sete pistas continuam preservados.
