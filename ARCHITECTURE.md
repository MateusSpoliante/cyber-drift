# Cyber Drift — arquitetura do projeto

## Stack atual

- **Vite**: servidor de desenvolvimento e build de produção.
- **Three.js 0.180+**: renderização 3D por ES Modules.
- **Rapier3D compat 0.21**: física WebAssembly com controlador veicular por raycast.
- **Web Audio API**: áudio sintetizado no navegador, sem arquivos de áudio externos.
- **Vercel Functions + PostgreSQL**: APIs, jogadores, recordes e ghosts.

O projeto mantém Vite e os endpoints atuais. Não usamos importmap/CDN no HTML principal porque o jogo já depende de módulos locais, CSS importado por JavaScript e integração com Vercel. Os addons oficiais do Three.js são importados por `three/addons/...`.

## Organização

```
api/                         # endpoints serverless existentes
db/                          # schema e migrações SQL existentes
src/
  main.js                    # jogo atual e integração dos sistemas existentes
  styles.css                 # HUD e interface atual
  game/
    Car.js                   # modelo 3D e animação visual atual
    CameraController.js      # câmeras atuais
    Track.js                 # linha central atual dos circuitos
    track/
      trackGeometry.js       # malhas atuais de asfalto, brita, zebras e barreiras
  engine/
    index.js                 # exports da nova arquitetura
    Engine.js                # loop com timestep fixo e interpolação
    PhysicsWorld.js          # inicialização e ciclo do Rapier
    VehicleController.js     # chassis rígido e quatro rodas raycast
    TrackBuilder.js          # pista 3D elevada, banking e colisões
    AudioSynth.js            # motor e chiado de pneus via Web Audio
    VFXSystem.js             # fumaça instanciada e skidmarks
    RenderPipeline.js        # EffectComposer, Bloom e SMAA
    EnvironmentBuilder.js    # PMREM e environment map procedural
    UIManager.js             # atualização desacoplada do HUD
index.html                   # shell da aplicação
```

## Nova arquitetura de simulação

1. `PhysicsWorld.create()` inicializa o WASM do Rapier e cria o mundo físico.
2. `TrackBuilder` gera a malha visual e o collider trimesh da pista, além das barreiras físicas.
3. `VehicleController` cria o rigid body do carro e usa `DynamicRayCastVehicleController` do Rapier com quatro rodas.
4. `Engine` executa a simulação em timestep fixo (padrão 120 Hz) e renderiza com interpolação.
5. `RenderPipeline`, `EnvironmentBuilder`, `LightingRig` e `CameraRig` cuidam de pós-processamento, reflexos, luz e câmera.
5. `AudioSynth`, `VFXSystem` e `UIManager` recebem telemetria e não controlam a física.

O controlador de veículo do Rapier é baseado em raycast; não é uma classe externa chamada `RaycastVehicle`. A suspensão, as forças de tração/frenagem e a aderência lateral são configuradas nas quatro rodas do controlador nativo.

## Estado da migração

A nova base foi adicionada em `src/engine/` sem substituir ainda o loop legado de `src/main.js`. Isso é intencional: garagem, seleção de circuitos, ghosts, recordes e APIs permanecem preservados enquanto a nova simulação é validada em etapas. A próxima etapa é ligar o novo motor à cena de jogo e migrar o controle do carro por circuito, com testes de colisão e de estabilidade antes de remover a física antiga.

## Comandos

- `npm install`: instala as dependências.
- `npm run dev`: inicia o Vite.
- `npm run build`: gera a versão de produção em `dist/`.
- `npm run preview`: testa o build.
- `npm run vercel:dev`: inicia frontend e funções Vercel localmente.

A API continua na pasta raiz `api/`; o build do Vite publica apenas o frontend em `dist/`.
