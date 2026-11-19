# Cyber Drift — engine de corrida

A física ativa do carro principal já foi migrada para Rapier. O `main.js` continua responsável por menus, garagem, personalização, HUD, cronômetro, voltas, recordes e comunicação com o backend.

## Integração ativa

- `PhysicsWorld`: inicialização do Rapier WASM, gravidade e passo fixo de 1/120 s.
- `VehicleController`: chassi dinâmico, quatro rodas raycast, suspensão, tração traseira, direção, freio e freio de mão.
- `main.js`: constrói colisores trimesh a partir das mesmas amostras usadas para desenhar o asfalto e os guardrails. Ao trocar de circuito, os colisores antigos são removidos e os novos são criados.
- A posição e rotação do carro visual são interpoladas a partir do corpo físico. O carro não é mais movimentado pelo antigo modelo cinemático.
- Os recordes continuam usando o fluxo existente; dados de carro fantasma e reprodução de fantasmas foram removidos.

## Escala e controles

O mundo usa metros e segundos. A simulação física roda a 120 Hz, com até oito subpassos por quadro.

- W / seta para cima: acelerar.
- S / seta para baixo: frear; parado, engatar ré.
- A/D ou setas: esterçar.
- Espaço: freio de mão / drift.
- Shift ou N: ERS / nitro.
- R: reposicionar o carro no centro da pista.
- Tab: reiniciar a volta.

## Módulos disponíveis para as próximas etapas

- `Engine.js`: loop genérico com timestep fixo e interpolação.
- `TrackBuilder.js`: construtor independente de pistas com spline, banking, zebras e barreiras físicas. As pistas atualmente usadas pelo jogo continuam sendo construídas pelo gerador existente em `src/game/track/trackGeometry.js`, com colisores Rapier paralelos.
- `AudioSynth.js`: síntese de motor e pneus via Web Audio API.
- `VFXSystem.js`: fumaça, faíscas e marcas de pneu com instancing.
- `RenderPipeline.js`: EffectComposer, Bloom e SMAA.
- `EnvironmentBuilder.js`: environment map procedural convertido via PMREM.
- `CameraRig.js` e `LightingRig.js`: câmera spring-arm e iluminação PBR.
- `UIManager.js`: atualização desacoplada do HUD.

## Próximas validações

A integração de código foi feita, mas ainda precisa de build e teste no navegador. Validar especialmente aderência das rodas ao asfalto, frenagem, ré, resposta do freio de mão, colisões dos guardrails, troca de pista e velocidade máxima antes de calibrar os valores finais.
