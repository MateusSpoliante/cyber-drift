# Cyber Drift — arquitetura do projeto

## Stack atual

- **Vite**: desenvolvimento e build de produção.
- **Three.js 0.180+**: renderização 3D por ES Modules.
- **Rapier3D compat 0.21**: física WebAssembly com controlador veicular por raycast.
- **Web Audio API**: áudio sintetizado no navegador, sem arquivos de áudio externos.
- **Vercel Functions + PostgreSQL**: autenticação, jogadores e recordes.

O projeto mantém Vite e os endpoints atuais. O HTML principal carrega módulos locais e CSS pelo entrypoint do Vite; addons oficiais do Three.js usam three/addons/....

## Organização

    api/                         # endpoints serverless existentes
    db/                          # schema e migrações SQL existentes
    src/
      main.js                    # jogo, loop de renderização e integração dos sistemas
      styles.css                 # HUD e interface
      game/
        Car.js                   # modelo 3D e animação visual
        CameraController.js      # câmeras de perseguição, distante e cockpit
        Track.js                 # linha central dos circuitos
        track/
          trackGeometry.js       # malhas de asfalto, zebras e barreiras
      engine/
        PhysicsWorld.js          # inicialização e ciclo do Rapier
        VehicleController.js     # chassis rígido e quatro rodas raycast
        VFXSystem.js             # fumaça, faíscas e marcas de pneus instanciadas
        Engine.js                # loop genérico com timestep fixo
        TrackBuilder.js          # construtor independente de pistas
        AudioSynth.js            # módulo alternativo de áudio
        RenderPipeline.js        # EffectComposer, Bloom e SMAA (não ativo)
        EnvironmentBuilder.js    # PMREM e environment map (não ativo)
        CameraRig.js              # rig alternativo (não ativo)
        LightingRig.js            # rig alternativo (não ativo)
        UIManager.js              # atualização desacoplada do HUD
    index.html                   # shell, canvas e favicon
    .github/workflows/build.yml  # validação automatizada do build

## Sistemas em execução

1. PhysicsWorld.create() inicializa o WASM do Rapier e cria o mundo físico.
2. main.js gera os circuitos a partir de Track.js e trackGeometry.js; os colisores trimesh da pista e guardrails são recriados quando o circuito muda.
3. VehicleController cria o rigid body e usa o controlador veicular nativo do Rapier com quatro rodas.
4. O loop principal acumula tempo e executa a física em passo fixo de 1/120 s, com até oito subpassos por frame.
5. CameraController acompanha o carro e atualiza o FOV de forma suavizada.
6. VFXSystem usa pools de instâncias para fumaça, faíscas e marcas de pneus, evitando criar/destruir meshes continuamente.
7. O renderer usa ACES Filmic, pixel ratio limitado e sombras em tempo real desativadas. Prédios, montanhas, contêineres e postes são agrupados com instancing para reduzir draw calls.
8. O SoundEngine existente em main.js sintetiza motor, pneus e nitro via Web Audio. A indisponibilidade de áudio não bloqueia a corrida.

## Módulos que permanecem disponíveis, mas não ativos

Engine.js, TrackBuilder.js, AudioSynth.js, RenderPipeline.js, EnvironmentBuilder.js, CameraRig.js, LightingRig.js e UIManager.js são módulos de apoio para futuras migrações. O jogo não ativa Bloom/SMAA ou PMREM neste momento porque o foco é manter uma taxa de quadros estável.

## Estado dos carros fantasmas

O cliente não armazena, desenha, reproduz ou envia amostras de carros fantasmas. Os sistemas de garagem, personalização, recordes e APIs de jogadores permanecem preservados.

## Validação

- Os arquivos JavaScript alterados passaram por verificação de sintaxe.
- O workflow .github/workflows/build.yml executa npm install e npm run build em pushes e pull requests.
- O build final desta rodada ainda precisa de confirmação: o Vercel sinalizou limite de builds, e o ambiente local desta sessão não conseguiu acessar o GitHub para executar o build.
- Testes reais no navegador continuam necessários para validar física, colisões, desempenho e efeitos em diferentes GPUs.
