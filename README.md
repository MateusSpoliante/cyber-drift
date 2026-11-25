# APEX-01 — Formula Racing Simulator (MVP Web / Vercel Ready)

Simulador de monopostos em navegador focado em **Time Trial**, construído seguindo a arquitetura técnica definida no documento de engenharia:

- **Física determinística em passo fixo de 240 Hz (`dt = 1/240 s`)** executada em **Web Worker** dedicado, desacoplado do loop de renderização (`requestAnimationFrame`).
- **Modelo Dinâmico Veicular**:
  - Dinâmica de 4 rodas / bicicleta avançada com transferência longitudinal e lateral de carga.
  - Modelo de aderência inspirado na **Magic Formula (Pacejka)** com elipse de atrito combinada.
  - Aerodinâmica dependente de $v^2$ (downforce ajustável por asa dianteira/traseira e arrasto).
  - Powertrain com curva de torque V6 Turbo Hybrid, caixa sequencial de 8 marchas, limitador de RPM, corte de ignição na troca e diferencial/freios configuráveis.
  - Detecção de superfície (Asfalto, Zebra, Grama/Brita) e validação rigorosa de limites de pista (*Track Limits*).
- **Renderização 3D (Three.js / WebGL2)**:
  - Circuito inspirado em Monza (retas de alta velocidade, chicanes, curvas parabólica e Lesmo) gerado proceduralmente com zebras, barreiras, pórticos de setores e iluminação dinâmica.
  - 3 Câmeras: **Cockpit (Halo)**, **T-Cam (Capô/TV)** e **Chase (Externa)**.
  - **Ghost Car** em tempo real reproduzindo sua melhor volta válida!
- **Telemetria, Setup & Ranking**:
  - Setup completo do carro (asas, distribuição de freio, pressão de pneus, diferencial, assistência TC/ABS/Câmbio).
  - Gravação de entradas quantizadas por tick (pronto para validação no servidor / Supabase) e exportação de telemetria JSON/CSV.

---

## Como rodar localmente

```bash
npm install
npm run dev
```

## Deploy na Vercel (100% compatível)

1. Suba este repositório para o GitHub (ou importe diretamente via Vercel CLI).
2. Na Vercel, selecione o framework **Vite** (já configurado automaticamente no `vercel.json`).
3. Build Command: `npm run build` | Output Directory: `dist`.
4. Clique em **Deploy**. Não requer headers `COOP/COEP` especiais pois a comunicação Worker ↔ Main Thread utiliza `postMessage` com `ArrayBuffer` transferível.

## Controles Padrão

- **W / Seta Cima**: Acelerador
- **S / Seta Baixo**: Freio
- **A / D ou Setas Esquerda/Direita**: Direção
- **E / Q** (ou **Shift / Ctrl**): Subir / Descer marcha (no modo Manual)
- **C**: Alternar Câmera (T-Cam / Cockpit / Externa)
- **R**: Reiniciar Volta
- **Gamepad / Volante**: Suporte nativo via Gamepad API (eixo esquerdo = direção, gatilhos RT/LT = acelerador/freio).
