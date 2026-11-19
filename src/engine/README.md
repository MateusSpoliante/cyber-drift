# Cyber Drift — engine de corrida

O carro principal usa Rapier3D para física em tempo fixo. O main.js mantém a integração com menus, garagem, personalização, HUD, cronômetro, voltas, recordes e backend.

## Sistemas ativos

- PhysicsWorld: inicialização do Rapier WASM, gravidade e passo fixo de 1/120 s.
- VehicleController: chassi dinâmico, quatro rodas raycast, suspensão, tração traseira, direção, freio e freio de mão.
- main.js: cria colisores trimesh a partir das mesmas amostras usadas para desenhar asfalto e guardrails. Ao trocar de circuito, os colisores são reconstruídos.
- CameraController: três modos de câmera com suavização independente do FPS; a matriz de projeção só é recalculada quando o FOV muda de forma perceptível.
- VFXSystem: fumaça, faíscas de nitro e marcas de pneus usando InstancedMesh e buffers reutilizáveis. Os efeitos são limpos ao reiniciar ou trocar de pista.
- main.js: renderização com ACES Filmic, resolução interna limitada, sem sombras em tempo real e cenário estático instanciado para reduzir draw calls.
- SoundEngine dentro de main.js: motor, pneus, nitro e efeitos de interface via Web Audio API. A corrida não é bloqueada se o áudio não estiver disponível.
- Os dados e a reprodução de carros fantasmas foram removidos do cliente, conforme solicitado.

## Escala e controles

O mundo usa metros e segundos. A simulação física roda a 120 Hz, com até oito subpassos por quadro.

- W / seta para cima: acelerar.
- S / seta para baixo: frear; parado, engatar ré.
- A/D ou setas: esterçar.
- Espaço: freio de mão / drift.
- Shift ou N: ERS / nitro.
- R: reposicionar o carro no centro da pista.
- Tab: reiniciar a volta.

## Módulos disponíveis, ainda não conectados ao loop principal

- Engine.js: loop genérico com timestep fixo e interpolação.
- TrackBuilder.js: construtor independente de pistas com spline, banking, zebras e barreiras físicas. As pistas do jogo continuam usando src/game/track/trackGeometry.js e os colisores Rapier paralelos.
- AudioSynth.js: alternativa modular de síntese de motor e pneus; o jogo ainda usa o SoundEngine existente em main.js.
- RenderPipeline.js: EffectComposer, Bloom e SMAA. Não está ativo porque o pós-processamento adicionaria custo à GPU, contrário à prioridade atual de fluidez.
- EnvironmentBuilder.js: environment map procedural via PMREM.
- CameraRig.js e LightingRig.js: rigs alternativos; o jogo usa CameraController e iluminação própria.
- UIManager.js: atualização desacoplada do HUD.

## Validação

- Sintaxe JavaScript dos arquivos alterados verificada.
- O repositório possui workflow de CI para executar npm install e npm run build.
- O último status do Vercel retornou limite de builds da conta, portanto o build final desta rodada ainda precisa de confirmação.
- Ainda é necessário testar no navegador a dirigibilidade, aderência das rodas, frenagem, ré, freio de mão, colisões dos guardrails, troca de pistas, fumaça e marcas de pneus.
