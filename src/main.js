import './styles.css';
import * as THREE from 'three';
import { buildTrackGeometry } from './game/track/trackGeometry.js';
import { createSportsCarMesh } from './game/Car.js';
import { CameraController } from './game/CameraController.js';
import { createTrackCenterline } from './game/Track.js';
import { PhysicsWorld } from './engine/PhysicsWorld.js';
import { VehicleController } from './engine/VehicleController.js';
import { VFXSystem } from './engine/VFXSystem.js';
// ==========================================
        // 1. F1-INSPIRED CIRCUITS & TRACK CONFIGS
        // ==========================================
        const STORAGE_KEY = 'cyber_drift_3d_time_records_v4';
        localStorage.removeItem('cyber_drift_auth_token_v1');
        let authToken = '';

        // Circuit centreline waypoints sampled from the public bacinger/f1-circuits GeoJSON.
        // Project longitude/latitude to a local metric plane and normalize to game coordinates.
        function projectF1Circuit(geoPoints, targetSpan = 1120) {
            const source = geoPoints.length > 2 &&
                geoPoints[0][0] === geoPoints[geoPoints.length - 1][0] &&
                geoPoints[0][1] === geoPoints[geoPoints.length - 1][1]
                ? geoPoints.slice(0, -1) : geoPoints;
            const lat0 = source.reduce((sum, p) => sum + p[1], 0) / source.length;
            const lon0 = source.reduce((sum, p) => sum + p[0], 0) / source.length;
            const cosLat = Math.cos(lat0 * Math.PI / 180);
            const metric = source.map(([lon, lat]) => [
                (lon - lon0) * 111320 * cosLat,
                -(lat - lat0) * 111320
            ]);
            const xs = metric.map(p => p[0]);
            const zs = metric.map(p => p[1]);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minZ = Math.min(...zs), maxZ = Math.max(...zs);
            const scale = targetSpan / (Math.max(maxX - minX, maxZ - minZ) || 1);
            const centerX = (minX + maxX) * 0.5;
            const centerZ = (minZ + maxZ) * 0.5;
            return metric.map(([x, z]) => [
                Number(((x - centerX) * scale).toFixed(2)),
                Number(((z - centerZ) * scale).toFixed(2))
            ]);
        }

        const TRACKS = {
            'desert-run': {
                name: 'AUTODROMO NAZIONALE MONZA',
                f1Ref: 'Inspirado em Monza (Itália)',
                difficulty: 'FÁCIL',
                diffColor: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/40',
                description: 'Templo da velocidade: reta principal, Variante del Rettifilo, Curva Grande, Lesmo, Ascari e Parabolica.',
                roadWidth: 18.0,
                wallOffset: 54.0,
                gripMultiplier: 1.06,
                theme: 'desert',
                sky: 0x1b120b,
                fog: 0x3b2212,
                fogDensity: 0.0013,
                curbA: 0x16a34a,
                curbB: 0xf8fafc,
                railColor: 0xff8533,
                tension: 0.35,
                points: projectF1Circuit([
                    [9.281223, 45.618975],
                    [9.281928, 45.624515],
                    [9.2820055, 45.625288],
                    [9.282082, 45.626061],
                    [9.283367, 45.629012],
                    [9.285634, 45.629841],
                    [9.288694, 45.630058],
                    [9.291588, 45.630506],
                    [9.295299, 45.631331],
                    [9.296536, 45.630883],
                    [9.296856, 45.628668],
                    [9.295033, 45.62772],
                    [9.292233, 45.62658],
                    [9.290321, 45.625448],
                    [9.287338, 45.623596],
                    [9.285953, 45.622728],
                    [9.28593, 45.622026],
                    [9.284994, 45.620956],
                    [9.28487, 45.620244],
                    [9.283734, 45.612679],
                    [9.28271, 45.611858],
                    [9.281573, 45.612193],
                    [9.280816, 45.613221],
                    [9.280733, 45.613923],
                    [9.280709, 45.61619]
                ])
            },
            'neon-city': {
                name: 'AUTÓDROMO DE INTERLAGOS',
                f1Ref: 'Inspirado em Interlagos (Brasil)',
                difficulty: 'MÉDIA',
                diffColor: 'text-cyan-300 bg-cyan-500/15 border-cyan-400/40',
                description: 'Traçado de Interlagos: S do Senna, Curva do Sol, Reta Oposta, miolo técnico e subida da Junção.',
                roadWidth: 16.8,
                wallOffset: 46.0,
                gripMultiplier: 1.0,
                theme: 'urban',
                sky: 0x060913,
                fog: 0x060913,
                fogDensity: 0.0019,
                curbA: 0xFF6500,
                curbB: 0xe2e8f0,
                railColor: 0x00f0ff,
                tension: 0.44,
                points: projectF1Circuit([
                    [-46.699905, -23.703744],
                    [-46.699329, -23.705785],
                    [-46.698795, -23.706404],
                    [-46.698112, -23.705949],
                    [-46.697071, -23.706281],
                    [-46.695885, -23.705812],
                    [-46.695344, -23.704543],
                    [-46.694788, -23.702519],
                    [-46.69421, -23.700508],
                    [-46.694033, -23.69985],
                    [-46.694372, -23.699475],
                    [-46.695326, -23.699318],
                    [-46.696301, -23.699759],
                    [-46.697645, -23.701447],
                    [-46.698327, -23.702266],
                    [-46.698714, -23.702384],
                    [-46.699215, -23.702321],
                    [-46.69972, -23.701928],
                    [-46.699929, -23.701013],
                    [-46.699938, -23.700713],
                    [-46.699662, -23.700494],
                    [-46.699116, -23.700774],
                    [-46.698443, -23.699203],
                    [-46.697901, -23.699378],
                    [-46.696706, -23.698532],
                    [-46.696095, -23.697531],
                    [-46.6971, -23.697018],
                    [-46.698843, -23.697352],
                    [-46.699693, -23.697933],
                    [-46.700536, -23.700812],
                    [-46.700053, -23.703195]
                ])
            },
            'harbor-night': {
                name: 'MARINA BAY STREET CIRCUIT',
                f1Ref: 'Inspirado em Marina Bay (Singapura)',
                difficulty: 'MÉDIA',
                diffColor: 'text-cyan-300 bg-cyan-500/15 border-cyan-400/40',
                description: 'Circuito urbano de Singapura: sequências de 90 graus, mudanças rápidas de direção e setores estreitos entre muros.',
                roadWidth: 15.8,
                wallOffset: 17.6,
                gripMultiplier: 1.02,
                theme: 'harbor',
                sky: 0x05131a,
                fog: 0x092630,
                fogDensity: 0.0020,
                curbA: 0x00f0ff,
                curbB: 0xf8fafc,
                railColor: 0x38bdf8,
                tension: 0.34,
                points: projectF1Circuit([
                    [103.864144, 1.291728],
                    [103.8644, 1.289773],
                    [103.864331, 1.289286],
                    [103.863821, 1.288685],
                    [103.862844, 1.288738],
                    [103.861606, 1.28887],
                    [103.861198, 1.289394],
                    [103.860998, 1.289558],
                    [103.859906, 1.289614],
                    [103.857335, 1.289751],
                    [103.856582, 1.289958],
                    [103.85567, 1.290759],
                    [103.855122, 1.291159],
                    [103.854862, 1.291024],
                    [103.85461, 1.290146],
                    [103.853943, 1.286718],
                    [103.853511, 1.286718],
                    [103.852848, 1.287436],
                    [103.852452, 1.287844],
                    [103.852408, 1.28832],
                    [103.851563, 1.289366],
                    [103.852328, 1.290722],
                    [103.853257, 1.292395],
                    [103.853982, 1.292358],
                    [103.855327, 1.292214],
                    [103.856059, 1.293037],
                    [103.858459, 1.291648],
                    [103.859101, 1.291454],
                    [103.862373, 1.291261],
                    [103.86291, 1.291769],
                    [103.86235, 1.294099],
                    [103.863273, 1.29445],
                    [103.863955, 1.293094]
                ])
            },
            'silverstone-gp': {
                name: 'SILVERSTONE CIRCUIT',
                f1Ref: 'Inspirado em Silverstone (Reino Unido)',
                difficulty: 'DIFÍCIL',
                diffColor: 'text-amber-300 bg-amber-500/15 border-amber-400/40',
                description: 'Maggotts, Becketts, Chapel, Hangar Straight, Stowe, Vale e a sequência final de alta velocidade.',
                roadWidth: 16.5,
                wallOffset: 53.0,
                gripMultiplier: 0.98,
                theme: 'airfield',
                sky: 0x0b1322,
                fog: 0x162238,
                fogDensity: 0.0017,
                curbA: 0xe11d48,
                curbB: 0xf8fafc,
                railColor: 0xf43f5e,
                tension: 0.48,
                points: projectF1Circuit([
                    [-1.015349, 52.07879],
                    [-1.01262, 52.078936],
                    [-1.011519, 52.078743],
                    [-1.010898, 52.078003],
                    [-1.010353, 52.076457],
                    [-1.010229, 52.075279],
                    [-1.010152, 52.074289],
                    [-1.009655, 52.073666],
                    [-1.009524, 52.073303],
                    [-1.010045, 52.07237],
                    [-1.010004, 52.071852],
                    [-1.009382, 52.071277],
                    [-1.009264, 52.070885],
                    [-1.009974, 52.070324],
                    [-1.011105, 52.069853],
                    [-1.012016, 52.06884],
                    [-1.015337, 52.065083],
                    [-1.016734, 52.063786],
                    [-1.017574, 52.063513],
                    [-1.018651, 52.063753],
                    [-1.019533, 52.064753],
                    [-1.020403, 52.065408],
                    [-1.021954, 52.066497],
                    [-1.022356, 52.066506],
                    [-1.023114, 52.066233],
                    [-1.024043, 52.066907],
                    [-1.024286, 52.067468],
                    [-1.023955, 52.067869],
                    [-1.020687, 52.070489],
                    [-1.019214, 52.071333],
                    [-1.017586, 52.071225],
                    [-1.015846, 52.07139],
                    [-1.013762, 52.072408],
                    [-1.013159, 52.072497],
                    [-1.012614, 52.071592],
                    [-1.011998, 52.071465],
                    [-1.011401, 52.07253],
                    [-1.011395, 52.072964],
                    [-1.011649, 52.07319],
                    [-1.018403, 52.07698],
                    [-1.019154, 52.077159],
                    [-1.020149, 52.076127],
                    [-1.020912, 52.075773],
                    [-1.021658, 52.076136],
                    [-1.020599, 52.077701],
                    [-1.019338, 52.078418],
                    [-1.017846, 52.078649]
                ])
            },
            'alpine-pass': {
                name: 'SPA-FRANCORCHAMPS',
                f1Ref: 'Inspirado em Spa (Bélgica)',
                difficulty: 'DIFÍCIL',
                diffColor: 'text-amber-300 bg-amber-500/15 border-amber-400/40',
                description: 'Spa-Francorchamps: La Source, Eau Rouge/Raidillon, Kemmel, Les Combes, Pouhon, Stavelot e Blanchimont.',
                roadWidth: 16.0,
                wallOffset: 58.0,
                gripMultiplier: 0.94,
                theme: 'alpine',
                sky: 0x091626,
                fog: 0x1d3147,
                fogDensity: 0.0018,
                curbA: 0xeab308,
                curbB: 0xdc2626,
                railColor: 0x38bdf8,
                tension: 0.48,
                points: projectF1Circuit([
                    [5.96502, 50.444251],
                    [5.963419, 50.446033],
                    [5.963786, 50.446188],
                    [5.966207, 50.445387],
                    [5.967876, 50.444463],
                    [5.970321, 50.442606],
                    [5.971315, 50.442168],
                    [5.971866, 50.441644],
                    [5.972061, 50.440937],
                    [5.972268, 50.440655],
                    [5.974245, 50.438642],
                    [5.974594, 50.438133],
                    [5.975719, 50.435639],
                    [5.977542, 50.431599],
                    [5.977234, 50.431123],
                    [5.976796, 50.430874],
                    [5.977033, 50.429747],
                    [5.97682, 50.429323],
                    [5.973257, 50.427739],
                    [5.972606, 50.42772],
                    [5.972227, 50.428182],
                    [5.974056, 50.429101],
                    [5.97434, 50.429431],
                    [5.973712, 50.430723],
                    [5.973091, 50.432627],
                    [5.972724, 50.433744],
                    [5.971599, 50.434192],
                    [5.97038, 50.434206],
                    [5.969208, 50.433782],
                    [5.967977, 50.432028],
                    [5.966622, 50.43044],
                    [5.965876, 50.430421],
                    [5.964556, 50.430694],
                    [5.962425, 50.428927],
                    [5.961697, 50.428771],
                    [5.959898, 50.429624],
                    [5.959602, 50.430209],
                    [5.960365, 50.431463],
                    [5.962135, 50.432712],
                    [5.9631, 50.433136],
                    [5.965385, 50.433895],
                    [5.966568, 50.434546],
                    [5.967356, 50.435455],
                    [5.968095, 50.43686],
                    [5.967699, 50.437624],
                    [5.966888, 50.438991],
                    [5.966562, 50.440183],
                    [5.966432, 50.441404],
                    [5.96732, 50.441701],
                    [5.966533, 50.442559]
                ])
            },
            'suzuka-apex': {
                name: 'SUZUKA FIGURE-8',
                f1Ref: 'Inspirado em Suzuka (Japão)',
                difficulty: 'EXTREMA',
                diffColor: 'text-orange-300 bg-orange-500/15 border-orange-400/50',
                description: 'Suzuka em formato de oito: Esses, Degner, hairpin, Spoon, reta oposta e 130R.',
                roadWidth: 15.0,
                wallOffset: 48.0,
                gripMultiplier: 0.93,
                theme: 'suzuka',
                sky: 0x12091c,
                fog: 0x231136,
                fogDensity: 0.0019,
                curbA: 0xdc2626,
                curbB: 0xf8fafc,
                railColor: 0xf43f5e,
                tension: 0.46,
                points: projectF1Circuit([
                    [136.540283, 34.843344],
                    [136.541609, 34.842034],
                    [136.54316, 34.840474],
                    [136.543422, 34.839982],
                    [136.543215, 34.839254],
                    [136.54271, 34.838956],
                    [136.541994, 34.839349],
                    [136.541079, 34.840502],
                    [136.540532, 34.840694],
                    [136.539821, 34.840753],
                    [136.539466, 34.841101],
                    [136.539253, 34.841765],
                    [136.538857, 34.84218],
                    [136.538436, 34.842293],
                    [136.537886, 34.8423],
                    [136.537146, 34.842681],
                    [136.53703, 34.843142],
                    [136.537382, 34.844157],
                    [136.536973, 34.844669],
                    [136.535713, 34.845066],
                    [136.534802, 34.844961],
                    [136.533974, 34.844543],
                    [136.532725, 34.84333],
                    [136.531038, 34.843132],
                    [136.530783, 34.843373],
                    [136.53026, 34.845549],
                    [136.530189, 34.845942],
                    [136.53062, 34.846958],
                    [136.530505, 34.847191],
                    [136.529804, 34.846567],
                    [136.52883, 34.845593],
                    [136.527504, 34.845362],
                    [136.525977, 34.845678],
                    [136.52472, 34.846457],
                    [136.52374, 34.848171],
                    [136.522958, 34.848369],
                    [136.521928, 34.847819],
                    [136.522189, 34.847257],
                    [136.523047, 34.846639],
                    [136.524316, 34.845926],
                    [136.525725, 34.845398],
                    [136.527294, 34.844923],
                    [136.529276, 34.844381],
                    [136.530842, 34.84391],
                    [136.532381, 34.844202],
                    [136.533524, 34.844966],
                    [136.534499, 34.845694],
                    [136.535406, 34.845649],
                    [136.536517, 34.846084],
                    [136.537572, 34.845843],
                    [136.538407, 34.845225]
                ])
            },
            'monaco-night': {
                name: 'CIRCUIT DE MONACO',
                f1Ref: 'Inspirado em Mônaco (Principado)',
                difficulty: 'EXTREMA',
                diffColor: 'text-red-300 bg-red-500/20 border-red-400/55',
                description: 'Mônaco: Sainte-Dévote, subida ao Casino, hairpin Fairmont, túnel, chicane do porto, Tabac e Rascasse.',
                roadWidth: 13.8,
                wallOffset: 15.2,
                gripMultiplier: 0.95,
                theme: 'monaco',
                sky: 0x050711,
                fog: 0x0c1226,
                fogDensity: 0.0021,
                curbA: 0xef4444,
                curbB: 0xf8fafc,
                railColor: 0xf59e0b,
                tension: 0.40,
                points: projectF1Circuit([
                    [7.427191, 43.739404],
                    [7.427171, 43.739494],
                    [7.428628, 43.741015],
                    [7.428814, 43.741114],
                    [7.429111, 43.740942],
                    [7.429139, 43.740694],
                    [7.429495, 43.740255],
                    [7.429749, 43.740321],
                    [7.429336, 43.74068],
                    [7.429295, 43.740802],
                    [7.429479, 43.74094],
                    [7.430238, 43.74109],
                    [7.430363, 43.740955],
                    [7.430204, 43.739746],
                    [7.429673, 43.73876],
                    [7.428963, 43.73816],
                    [7.428004, 43.737767],
                    [7.426165, 43.737301],
                    [7.42545, 43.73717],
                    [7.425009, 43.73705],
                    [7.42369, 43.736937],
                    [7.422253, 43.736779],
                    [7.42196, 43.736392],
                    [7.421805, 43.735565],
                    [7.422472, 43.734125],
                    [7.423114, 43.732805],
                    [7.422722, 43.733039],
                    [7.421753, 43.733435],
                    [7.421216, 43.735433],
                    [7.421452, 43.736696],
                    [7.422583, 43.737069],
                    [7.424172, 43.737373],
                    [7.425743, 43.737718],
                    [7.426784, 43.737904],
                    [7.427523, 43.738093],
                    [7.427877, 43.738494],
                    [7.427674, 43.739033],
                    [7.427388, 43.73921]
                ])
            }
        };

        let selectedTrackId = TRACKS[localStorage.getItem('cyber_drift_track_v1')] ? localStorage.getItem('cyber_drift_track_v1') : 'neon-city';
        let trackWorld = null;
        let physicsWorld = null;
        let physicsVehicle = null;
        let physicsTrackColliders = [];
        let physicsAccumulator = 0;
        const PHYSICS_FIXED_STEP = 1 / 120;
        const PROFILE_KEY = 'cyber_drift_profile_v1';
        const DEVICE_KEY = 'cyber_drift_device_id_v1';
        const PENDING_KEY = 'cyber_drift_pending_records_v1';
        const RECORDS_API = '/api/records';
        const PLAYERS_API = '/api/players';
        let apiAvailable = false;
        let rankingPeriod = 'all';
        let currentPublicPlayer = null;
        let selectedBodyColor = '#141820';
        let selectedAccentColor = '#FF6500';
        let localProfile = loadLocalProfile();

        function createTrackPreviewSvg(points, active = false) {
            if (!Array.isArray(points) || points.length < 3) return '';

            const xs = points.map(point => point[0]);
            const zs = points.map(point => point[1]);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minZ = Math.min(...zs), maxZ = Math.max(...zs);
            const spanX = Math.max(1, maxX - minX);
            const spanZ = Math.max(1, maxZ - minZ);
            const width = 144, height = 76, padding = 9;
            const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanZ);
            const offsetX = (width - spanX * scale) / 2;
            const offsetY = (height - spanZ * scale) / 2;
            const coords = points.map(([x, z]) => [
                Number((offsetX + (x - minX) * scale).toFixed(1)),
                Number((offsetY + (maxZ - z) * scale).toFixed(1))
            ]);
            const path = coords.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z';
            const start = coords[0];
            const stroke = active ? '#ff8533' : '#22d3ee';

            return `
                <svg class="track-preview-svg" viewBox="0 0 144 76" role="img" aria-label="Formato do circuito">
                    <path d="${path}" fill="none" stroke="${stroke}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" opacity="0.13"/>
                    <path d="${path}" fill="none" stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="${path}" fill="none" stroke="#e2e8f0" stroke-width="1.1" stroke-dasharray="3 4" opacity="0.55"/>
                    <circle cx="${start[0]}" cy="${start[1]}" r="3.3" fill="#f8fafc" stroke="#07111c" stroke-width="1.2"/>
                </svg>
            `;
        }

        function renderTrackCards() {
            const container = document.getElementById('track-cards-grid');
            if (!container) return;

            container.innerHTML = Object.entries(TRACKS).map(([id, track]) => {
                const active = id === selectedTrackId;
                return `
                    <button type="button" data-track-card="${id}" aria-pressed="${active}" class="cyber-card w-full flex items-center gap-3 text-left p-2.5 rounded-xl cursor-pointer ${active ? 'track-card-active' : ''}">
                        <span class="track-preview shrink-0 w-28 h-[4.5rem] rounded-lg border border-slate-700/80 bg-slate-950/90 flex items-center justify-center overflow-hidden">
                            ${createTrackPreviewSvg(track.points, active)}
                        </span>
                        <span class="min-w-0 flex-1">
                            <span class="flex items-center justify-between gap-2 mb-1">
                                <span class="font-orbitron font-black text-xs sm:text-sm text-white tracking-wide truncate">${track.name}</span>
                                <span class="shrink-0 text-[9px] font-orbitron font-bold px-2 py-1 rounded border ${track.diffColor}">${track.difficulty}</span>
                            </span>
                            <span class="block text-[10px] font-orbitron text-cyan-300/90 truncate">${track.f1Ref.replace('Inspirado em ', '')}</span>
                            <span class="block text-[10px] text-slate-400 mt-1">${track.roadWidth.toFixed(1)} m de largura · ${active ? 'SELECIONADA' : 'CLIQUE PARA SELECIONAR'}</span>
                        </span>
                    </button>
                `;
            }).join('');

            // One delegated handler survives every list re-render and also catches clicks
            // on the SVG/path inside each card.
            if (!container.dataset.trackClickBound) {
                container.addEventListener('click', event => {
                    const target = event.target instanceof Element
                        ? event.target.closest('[data-track-card]')
                        : null;
                    if (!target || !container.contains(target)) return;
                    selectTrack(target.dataset.trackCard);
                });
                container.dataset.trackClickBound = 'true';
            }
        }

        function selectTrack(trackId) {
            if (!TRACKS[trackId]) return;
            selectedTrackId = trackId;
            localStorage.setItem('cyber_drift_track_v1', selectedTrackId);
            const sel = document.getElementById('track-select');
            if (sel) sel.value = selectedTrackId;

            const cfg = TRACKS[selectedTrackId];
            document.getElementById('ranking-track-subtitle').innerText = `CIRCUITO: ${cfg.name}`;
            document.getElementById('hud-track-name').innerText = cfg.name;
            document.getElementById('hud-track-diff').innerText = cfg.difficulty;
            document.getElementById('hud-track-diff').className = `text-[10px] font-orbitron font-bold px-2 py-0.5 rounded border ${cfg.diffColor}`;
            document.getElementById('pause-track-title').innerText = cfg.name;

            renderTrackCards();
            buildWorldAndTrack();
            rebuildPhysicsTrack();
            resetPlayerToStart();
            player.bestLapMs = null;
            document.getElementById('best-display').innerText = '--:--.--';
            refreshRecordsFromApi();
            updateMinimap();
            showToast(`CIRCUITO: ${cfg.name} (${cfg.difficulty})`);
        }

        async function authenticate(action) {
            const username = document.getElementById('auth-username').value.trim();
            const password = document.getElementById('auth-password').value;
            const status = document.getElementById('auth-status');
            const buttons = [document.getElementById('login-btn'), document.getElementById('register-btn')];
            buttons.forEach(b => b.disabled = true);
            status.textContent = 'Conectando...';
            status.className = 'text-[11px] text-cyan-300 mt-2';
            try {
                const response = await fetch('/api/auth', {method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body:JSON.stringify({action,username,password})});
                const data = await response.json().catch(()=>({}));
                if (!response.ok) throw new Error(data.error || 'Não foi possível entrar.');
                authToken = 'active';
                localProfile = {...localProfile,...data.player,name:data.player.username || data.player.displayName};
                persistLocalProfile();
                apiAvailable = true;
                document.getElementById('start-btn').disabled = false;
                document.getElementById('start-btn').classList.remove('opacity-50');
                status.textContent = `Conectado como ${localProfile.name}.`;
                status.className = 'text-[11px] text-emerald-300 mt-2 font-semibold';
                document.getElementById('open-garage-btn').textContent = 'GARAGEM / MEU PERFIL';
                document.getElementById('logout-btn').classList.remove('hidden');
                await refreshRecordsFromApi();
                await syncPendingRecords();
            } catch (error) {
                status.textContent = error.message || 'Falha de conexão.';
                status.className = 'text-[11px] text-red-300 mt-2';
            } finally { buttons.forEach(b => b.disabled = false); }
        }

        async function restoreSession() {
            try {
                const response = await fetch('/api/auth', {headers:{'Accept':'application/json'}});
                if (!response.ok) throw new Error('Sessão ausente ou expirada.');
                const data = await response.json();
                authToken = 'active';
                localProfile = {...localProfile,...data.player,name:data.player.username || data.player.displayName};
                persistLocalProfile();
                document.getElementById('start-btn').disabled = false;
                document.getElementById('start-btn').classList.remove('opacity-50');
                document.getElementById('logout-btn').classList.remove('hidden');
                document.getElementById('auth-status').textContent = `Conectado como ${localProfile.name}.`;
                document.getElementById('auth-status').className = 'text-[11px] text-emerald-300 mt-2 font-semibold';
                await syncPendingRecords();
            } catch {
                authToken = '';
                document.getElementById('start-btn').disabled = true;
                document.getElementById('start-btn').classList.add('opacity-50');
            }
        }

        function makeId() {
            if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&3|8)).toString(16); });
        }
        function loadLocalProfile() {
            try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}'); } catch { return {}; }
        }
        function persistLocalProfile() { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(localProfile)); } catch {} }
        function loadRecords() {
            try {
                let raw = localStorage.getItem(`${STORAGE_KEY}_${selectedTrackId}`);
                const parsed = JSON.parse(raw || '[]'); return Array.isArray(parsed) ? parsed.sort((a,b)=>a.timeMs-b.timeMs).slice(0,10) : [];
            } catch { return []; }
        }
        function loadPendingRecords() { try { const a=JSON.parse(localStorage.getItem(PENDING_KEY)||'[]'); return Array.isArray(a)?a.filter(item=>item && TRACKS[item.trackId] && item.clientRecordId):[]; } catch { return []; } }
        function savePendingRecords(items) { try { localStorage.setItem(PENDING_KEY,JSON.stringify(items.slice(-50))); } catch {} }
        let syncingPending=false;
        async function syncPendingRecords() {
            if(syncingPending) return; const pending=loadPendingRecords(); if(!pending.length) return; if(!authToken) { showToast('ENTRE NA CONTA PARA SINCRONIZAR RECORDES PENDENTES'); return; } syncingPending=true;
            const remaining=[];
            for(const item of pending) {
                try {
                    const data=await postRecordToDb(item); apiAvailable=true;
                    if(data.player) { localProfile={...localProfile,...data.player,name:data.player.displayName}; persistLocalProfile(); }
                } catch (e) { if(!e.fatal) remaining.push(item); }
            }
            syncingPending=false;
            savePendingRecords(remaining);
            if (pending.length && !remaining.length) {
                try { const latest=await fetch(`${RECORDS_API}?period=${encodeURIComponent(rankingPeriod)}&trackId=${encodeURIComponent(selectedTrackId)}`); const payload=await latest.json(); if(latest.ok && Array.isArray(payload.records)) cacheRecords(payload.records); } catch {}
            }
            renderLeaderboards();
            if(pending.length && !remaining.length) showToast('RECORDES OFFLINE SINCRONIZADOS');
        }
        window.addEventListener('online', () => { syncPendingRecords(); refreshRecordsFromApi(); });
        setInterval(() => { if (loadPendingRecords().length) syncPendingRecords(); }, 30000);
        function cacheRecords(records) { try { localStorage.setItem(`${STORAGE_KEY}_${selectedTrackId}`, JSON.stringify(records.slice(0,10))); } catch {} }
        async function refreshRecordsFromApi() {
            try {
                const response = await fetch(`${RECORDS_API}?period=${encodeURIComponent(rankingPeriod)}&trackId=${encodeURIComponent(selectedTrackId)}`, {headers:{'Accept':'application/json'}});
                if (!response.ok) throw new Error(`API ${response.status}`);
                const data = await response.json();
                if (!Array.isArray(data.records)) throw new Error('Resposta inválida');
                apiAvailable = true; cacheRecords(data.records); renderLeaderboards();
                await syncPendingRecords();
            } catch { apiAvailable = false; renderLeaderboards(); }
        }
        let lastSaveSynced = false;
        async function postRecordToDb(record) {
            let lastError = null;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 12000);
                    const response = await fetch(RECORDS_API,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(record),signal:ctrl.signal});
                    clearTimeout(timer);
                    const data = await response.json().catch(()=>({}));
                    if (response.ok) return data;
                    if (response.status >= 400 && response.status < 500) { const e = new Error(data.error || 'Recorde rejeitado pelo servidor.'); e.fatal = response.status !== 401; e.auth = response.status === 401; throw e; }
                    lastError = new Error(data.error || 'Falha ao salvar no banco.');
                } catch (e) { if (e.fatal) throw e; lastError = e; }
                await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
            }
            throw lastError || new Error('Falha ao salvar no banco.');
        }
        async function saveNewRecord(pilotName, timeMs) {
            const cleanName = (pilotName || '').trim().toUpperCase().replace(/[^A-Z0-9_ -]/g,'').slice(0,16);
            if (!cleanName) throw new Error('Digite um apelido válido.');
            const record = {name:cleanName,timeMs:Math.round(timeMs),trackId:selectedTrackId,clientRecordId:makeId()};
            try {
                const data = await postRecordToDb(record);
                apiAvailable = true; lastSaveSynced = true;
                localProfile = {...localProfile,...data.player,name:cleanName}; persistLocalProfile();
                cacheRecords(data.records || []); renderLeaderboards(); return data.rank || null;
            } catch (error) {
                if (error.fatal) throw error;
                apiAvailable = false; lastSaveSynced = false;
                const pending=loadPendingRecords(); pending.push(record); savePendingRecords(pending);
                return null;
            }
        }
        function getEstimatedRank(timeMs) { return loadRecords().filter(r=>timeMs>=r.timeMs).length+1; }
        function renderLeaderboards() {
            const records=loadRecords();
            const wrEl=document.getElementById('wr-display'); if(wrEl) wrEl.innerText=records.length?formatTime(records[0].timeMs):'--:--.--';
            const menuList=document.getElementById('menu-leaderboard-list');
            if(menuList) menuList.innerHTML=records.length?records.map((r,idx)=>{const first=idx===0;const col=first?'text-[#FF6500] font-black':idx<3?'text-cyan-300 font-bold':'text-slate-300';return `<div class="flex justify-between items-center px-3 py-2 rounded-lg ${first?'bg-[#FF6500]/15 border border-[#FF6500]/50':'bg-slate-950/75 border border-slate-800/80'}"><button data-player-id="${escapeHtml(r.playerId||'')}" data-player-name="${escapeHtml(r.name)}" class="font-orbitron ${col} hover:underline cursor-pointer text-left truncate pr-2">#${idx+1} ${escapeHtml(r.name)}</button><span class="font-orbitron font-bold tabular-nums ${first?'text-[#FF6500]':'text-emerald-400'}">${formatTime(r.timeMs)}</span></div>`}).join(''):'<div class="text-slate-400 text-center py-6 leading-relaxed">Ainda não há recordes neste circuito.<br>Seja o primeiro a marcar tempo!</div>';
            const hudList=document.getElementById('hud-leaderboard-list'); if(hudList) hudList.innerHTML=records.length?records.slice(0,5).map((r,idx)=>`<div class="flex justify-between items-center"><span class="font-orbitron text-[11px] truncate pr-2 ${idx===0?'text-[#FF6500] font-bold':'text-slate-200'}">${idx+1}. ${escapeHtml(r.name)}</span><span class="font-orbitron text-[11px] font-bold tabular-nums ${idx===0?'text-[#FF6500]':'text-cyan-300'}">${formatTime(r.timeMs)}</span></div>`).join(''):'<div class="text-slate-400 text-[11px]">Sem tempos registrados ainda.</div>';
            document.querySelectorAll('[data-player-id]').forEach(el=>el.addEventListener('click',()=>openPublicProfile(el.dataset.playerId,el.dataset.playerName)));
        }
        async function loadPlayers() {
            const el=document.getElementById('public-players-list');
            try { const r=await fetch(PLAYERS_API); if(!r.ok) throw new Error(); const d=await r.json(); const players=d.players||[];
                el.innerHTML=players.length?players.map(p=>`<button data-profile-id="${escapeHtml(p.id)}" class="w-full flex justify-between p-2 rounded bg-slate-900 hover:bg-slate-800 cursor-pointer"><span class="font-orbitron text-cyan-200">${escapeHtml(p.displayName)}</span><span class="text-slate-400">Nível ${p.level||1}</span></button>`).join(''):'<div class="text-slate-400">Nenhum perfil online ainda.</div>';
                el.querySelectorAll('[data-profile-id]').forEach(b=>b.addEventListener('click',()=>openPublicProfile(b.dataset.profileId,b.querySelector('span').textContent)));
            } catch { el.innerHTML='<div class="text-slate-400">Ranking público disponível após configurar o banco online.</div>'; }
        }
        async function openPublicProfile(id,name) {
            if(id==='local') { openGarage(); return; }
            if(!id) { showToast('PERFIL NÃO DISPONÍVEL PARA ESTE RECORDE'); return; }
            try { const r=await fetch(`${PLAYERS_API}?id=${encodeURIComponent(id)}&trackId=${encodeURIComponent(selectedTrackId)}`); if(!r.ok) throw new Error(); const d=await r.json();
                const p=d.player; document.getElementById('garage-title').innerText='GARAGEM DO PILOTO';
                document.getElementById('garage-player-name').innerText=p.displayName||name;
                document.getElementById('garage-level').innerText=p.level||1; document.getElementById('garage-races').innerText=p.races||0;
                document.getElementById('garage-best').innerText=p.bestTime?formatTime(p.bestTime):'--:--.--'; document.getElementById('garage-xp').innerText=p.xp||0;
                currentPublicPlayer = p;
                selectedBodyColor = p.bodyColor || '#141820'; selectedAccentColor = p.accentColor || '#FF6500'; applyCarCustomization();
                document.getElementById('body-color-options').style.opacity='.45'; document.getElementById('accent-color-options').style.opacity='.45';
                document.getElementById('body-color-options').style.pointerEvents='none'; document.getElementById('accent-color-options').style.pointerEvents='none'; document.getElementById('save-garage-btn').classList.add('hidden');
                document.getElementById('garage-save-status').innerText='Visualização pública — garagem somente para consulta.';
                document.getElementById('return-own-garage-btn').classList.remove('hidden');
                document.getElementById('garage-modal').classList.remove('hidden'); document.getElementById('garage-modal').classList.add('flex');
            } catch { showToast('NÃO FOI POSSÍVEL ABRIR ESTE PERFIL'); }
        }
        function closeGarage() {
            document.getElementById('garage-modal').classList.add('hidden');
            document.getElementById('garage-modal').classList.remove('flex');
            currentPublicPlayer = null;
            selectedBodyColor = localProfile.bodyColor || '#141820'; selectedAccentColor = localProfile.accentColor || '#FF6500'; applyCarCustomization();
        }
        function openGarage() {
            currentPublicPlayer = null;
            document.getElementById('return-own-garage-btn').classList.add('hidden');
            document.getElementById('garage-title').innerText='MINHA GARAGEM';
            document.getElementById('garage-player-name').innerText=localProfile.name||'NOVO PILOTO';
            const xp=localProfile.xp||0; document.getElementById('garage-xp').innerText=xp; document.getElementById('garage-level').innerText=Math.floor(xp/500)+1;
            document.getElementById('garage-races').innerText=localProfile.races||0; document.getElementById('garage-best').innerText='--:--.--';
            document.getElementById('body-color-options').style.opacity='1'; document.getElementById('accent-color-options').style.opacity='1';
            document.getElementById('body-color-options').style.pointerEvents='auto'; document.getElementById('accent-color-options').style.pointerEvents='auto'; document.getElementById('save-garage-btn').classList.remove('hidden');
            document.getElementById('garage-save-status').innerText='As cores são aplicadas ao seu veículo atual.';
            selectedBodyColor=localProfile.bodyColor||'#141820'; selectedAccentColor=localProfile.accentColor||'#FF6500'; applyCarCustomization();
            document.getElementById('garage-modal').classList.remove('hidden'); document.getElementById('garage-modal').classList.add('flex'); loadPlayers();
            if (authToken && localProfile.id) {
                fetch(`${PLAYERS_API}?id=${encodeURIComponent(localProfile.id)}&trackId=${encodeURIComponent(selectedTrackId)}`)
                    .then(r => r.ok ? r.json() : null)
                    .then(d => { if (d?.player && !currentPublicPlayer) document.getElementById('garage-best').innerText = d.player.bestTime ? formatTime(d.player.bestTime) : '--:--.--'; })
                    .catch(() => {});
            }
        }
        function applyCarCustomization() {
            if(playerCar?.bodyMat) playerCar.bodyMat.color.set(selectedBodyColor);
            if(playerCar?.orangeMat) playerCar.orangeMat.color.set(selectedAccentColor);
            if(playerCar?.rimMat) playerCar.rimMat.color.set(selectedAccentColor);
            if(playerCar?.underglowMat) playerCar.underglowMat.color.set(selectedAccentColor);
            if(previewCar?.bodyMat) previewCar.bodyMat.color.set(selectedBodyColor);
            if(previewCar?.orangeMat) previewCar.orangeMat.color.set(selectedAccentColor);
            if(previewCar?.rimMat) previewCar.rimMat.color.set(selectedAccentColor);
            if(previewCar?.underglowMat) previewCar.underglowMat.color.set(selectedAccentColor);
            document.querySelectorAll('.color-swatch').forEach(b=>b.style.outline=b.dataset.color.toLowerCase()===selectedBodyColor.toLowerCase()?'2px solid white':'none');
            document.querySelectorAll('.accent-swatch').forEach(b=>b.style.outline=b.dataset.color.toLowerCase()===selectedAccentColor.toLowerCase()?'2px solid white':'none');
        }
        async function saveGarage() {
            localProfile.bodyColor=selectedBodyColor; localProfile.accentColor=selectedAccentColor; persistLocalProfile(); applyCarCustomization();
            const status=document.getElementById('garage-save-status');
            status.className='text-xs text-emerald-300 font-orbitron mt-2';
            if(apiAvailable && localProfile.id) {
                try {
                    const r=await fetch(PLAYERS_API,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({bodyColor:selectedBodyColor,accentColor:selectedAccentColor})});
                    if(!r.ok) throw new Error();
                    status.innerText='✓ PERSONALIZAÇÃO SALVA NO PERFIL ONLINE!';
                    showToast('PERSONALIZAÇÃO SALVA!');
                    return;
                } catch {}
            }
            status.innerText='✓ PERSONALIZAÇÃO SALVA NESTE DISPOSITIVO!';
            showToast('PERSONALIZAÇÃO SALVA!');
        }
        function escapeHtml(str) { return String(str).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }


        // ==========================================
        // 2. PROCEDURAL AUDIO ENGINE (WEB AUDIO API)
        // ==========================================
        class SoundEngine {
            constructor() {
                this.ctx = null;
                this.masterGain = null;
                this.engineOsc1 = null;
                this.engineOsc2 = null;
                this.engineFilter = null;
                this.engineGain = null;
                this.driftGain = null;
                this.nitroGain = null;
                this.initialized = false;
            }

            init() {
                if (this.initialized) {
                    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
                    return;
                }
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioCtx();

                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.value = 0.28;
                this.masterGain.connect(this.ctx.destination);

                this.engineOsc1 = this.ctx.createOscillator();
                this.engineOsc2 = this.ctx.createOscillator();
                this.engineOsc1.type = 'sawtooth';
                this.engineOsc2.type = 'triangle';
                this.engineOsc1.frequency.value = 58;
                this.engineOsc2.frequency.value = 116;

                this.engineFilter = this.ctx.createBiquadFilter();
                this.engineFilter.type = 'lowpass';
                this.engineFilter.frequency.value = 340;

                this.engineGain = this.ctx.createGain();
                this.engineGain.gain.value = 0.12;

                this.engineOsc1.connect(this.engineFilter);
                this.engineOsc2.connect(this.engineFilter);
                this.engineFilter.connect(this.engineGain);
                this.engineGain.connect(this.masterGain);

                this.engineOsc1.start();
                this.engineOsc2.start();

                const bufferSize = this.ctx.sampleRate * 2;
                const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }

                const driftNoise = this.ctx.createBufferSource();
                driftNoise.buffer = noiseBuffer;
                driftNoise.loop = true;

                const driftFilter = this.ctx.createBiquadFilter();
                driftFilter.type = 'bandpass';
                driftFilter.frequency.value = 1180;
                driftFilter.Q.value = 4.5;

                this.driftGain = this.ctx.createGain();
                this.driftGain.gain.value = 0;

                driftNoise.connect(driftFilter);
                driftFilter.connect(this.driftGain);
                this.driftGain.connect(this.masterGain);
                driftNoise.start();

                const nitroNoise = this.ctx.createBufferSource();
                nitroNoise.buffer = noiseBuffer;
                nitroNoise.loop = true;

                const nitroFilter = this.ctx.createBiquadFilter();
                nitroFilter.type = 'bandpass';
                nitroFilter.frequency.value = 650;
                nitroFilter.Q.value = 1.2;

                this.nitroGain = this.ctx.createGain();
                this.nitroGain.gain.value = 0;

                nitroNoise.connect(nitroFilter);
                nitroFilter.connect(this.nitroGain);
                this.nitroGain.connect(this.masterGain);
                nitroNoise.start();

                this.initialized = true;
            }

            update(speedRatio, isDrifting, isNitro) {
                if (!this.initialized || !this.ctx) return;
                const now = this.ctx.currentTime;
                const baseFreq = 50 + speedRatio * 245 + (isNitro ? 75 : 0);
                this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
                this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.04);
                this.engineFilter.frequency.setTargetAtTime(280 + speedRatio * 1200 + (isNitro ? 700 : 0), now, 0.05);
                this.engineGain.gain.setTargetAtTime(0.11 + speedRatio * 0.17, now, 0.04);

                this.driftGain.gain.setTargetAtTime(isDrifting ? 0.16 : 0, now, 0.05);
                this.nitroGain.gain.setTargetAtTime(isNitro ? 0.28 : 0, now, 0.04);
            }

            playBump(intensity = 0.5) {
                if (!this.initialized || !this.ctx) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(115, now);
                osc.frequency.exponentialRampToValueAtTime(28, now + 0.18);

                gain.gain.setValueAtTime(Math.min(0.45, intensity * 0.4), now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now);
                osc.stop(now + 0.19);
            }

            playChime(isNewRecord = false) {
                if (!this.initialized || !this.ctx) return;
                const now = this.ctx.currentTime;
                const notes = isNewRecord ? [523.25, 659.25, 783.99, 1046.5] : [587.33, 880];
                notes.forEach((freq, i) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + i * 0.08);
                    gain.gain.setValueAtTime(0.22, now + i * 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
                    osc.connect(gain);
                    gain.connect(this.masterGain);
                    osc.start(now + i * 0.08);
                    osc.stop(now + i * 0.08 + 0.36);
                });
            }
        }

        const sound = new SoundEngine();

        // ==========================================
        // 3. GLOBALS & DYNAMIC TRACK DIMENSIONS
        // ==========================================
        let scene, camera, renderer;
        let cameraController = null;
        let trackCurve, trackSamples = [];
        const TRACK_SAMPLES_COUNT = 720;
        let ROAD_HALF_WIDTH = 16.8;
        let WALL_OFFSET = 18.3;

        // Speed scale tuned for a gradual, controllable acceleration curve.
        const SPEED_MULTIPLIER = 156;
        const BASE_TOP_SPEED = 2.22; // ~346 km/h
        const NITRO_TOP_SPEED = 2.56; // ~399 km/h with temporary ERS boost
        const NITRO_LOCK_TIME = 2.4;
        const NITRO_MIN_IGNITE = 25;
        const NITRO_RECHARGE_DELAY = 0.85;

        let playerCar;
        let vfxSystem = null;
        const smokeSpawnPosition = new THREE.Vector3();
        const smokeSpawnVelocity = new THREE.Vector3(0, 1, 0);
        const sparkNormal = new THREE.Vector3(0, 1, 0);
        let minimapBounds = { centerX: 0, centerZ: 0, scale: 1 };

        let gameState = 'MENU'; // MENU, PLAYING, PAUSED, MODAL
        let pausedElapsedMs = 0;
        let recordSavedForPending = false;
        let timerStarted = false;
        let cameraMode = 0; // 0: Chase Close, 1: Chase Far, 2: Hood Cam
        const CAMERA_NAMES = ['PERSEGUIÇÃO', 'AÉREA DISTANTE', 'CAPÔ (PRIMEIRA PESSOA)'];

        const player = {
            pos: new THREE.Vector3(),
            heading: 0,
            velAngle: 0,
            speed: 0,
            nitro: 100,
            nitroLock: 0,
            nitroDelay: 0,
            nitroArmed: true,
            isNitro: false,
            isDrifting: false,
            steerInput: 0,
            lap: 1,
            trackT: 0,
            sector1Done: false,
            sector2Done: false,
            lapStartTime: 0,
            bestLapMs: null,
            pendingRecordTimeMs: null
        };

        const keys = { w: false, s: false, a: false, d: false, space: false, shift: false, n: false };
        let cameraShake = 0;
        let driftScore = 0;
        let driftCombo = 1;
        let driftChainSeconds = 0;
        let previewCar = null;
        let previewScene = null;
        let previewCamera = null;
        let previewRenderer = null;

        function clearInputKeys() {
            keys.w = false;
            keys.s = false;
            keys.a = false;
            keys.d = false;
            keys.space = false;
            keys.shift = false;
            keys.n = false;
        }

        // ==========================================
        // 4. PROCEDURAL TEXTURES
        // ==========================================
        function createAsphaltTexture(theme = 'urban') {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d', { alpha: false });

            const base = theme === 'desert' ? '#292722'
                : theme === 'alpine' ? '#252d35'
                : theme === 'suzuka' ? '#222a35'
                : '#242c36';
            ctx.fillStyle = base;
            ctx.fillRect(0, 0, 1024, 1024);

            // Fine asphalt aggregate with a fixed seed: stable texture on every load.
            let seed = 481516;
            const random = () => {
                seed = (seed * 1664525 + 1013904223) >>> 0;
                return seed / 4294967296;
            };
            for (let i = 0; i < 42000; i++) {
                const shade = 24 + Math.floor(random() * 25);
                const alpha = 0.12 + random() * 0.24;
                ctx.fillStyle = `rgba(${shade},${shade + 3},${shade + 7},${alpha})`;
                const size = 1 + random() * 1.3;
                ctx.fillRect(random() * 1024, random() * 1024, size, size);
            }

            // Subtle, continuous rubber racing lines; no baked-in white edge marks.
            const groove = ctx.createLinearGradient(0, 0, 1024, 0);
            groove.addColorStop(0, 'rgba(0,0,0,0.02)');
            groove.addColorStop(0.22, 'rgba(0,0,0,0.13)');
            groove.addColorStop(0.36, 'rgba(0,0,0,0.23)');
            groove.addColorStop(0.5, 'rgba(0,0,0,0.12)');
            groove.addColorStop(0.64, 'rgba(0,0,0,0.23)');
            groove.addColorStop(0.78, 'rgba(0,0,0,0.13)');
            groove.addColorStop(1, 'rgba(0,0,0,0.02)');
            ctx.fillStyle = groove;
            ctx.fillRect(0, 0, 1024, 1024);

            // Fine longitudinal wear, intentionally low contrast.
            for (let i = 0; i < 90; i++) {
                const x = random() * 1024;
                ctx.fillStyle = `rgba(190,200,210,${0.012 + random() * 0.025})`;
                ctx.fillRect(x, 0, 1 + random() * 2, 1024);
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.anisotropy = renderer?.capabilities?.getMaxAnisotropy?.() || 8;
            return texture;
        }

        function createGroundTexture(theme = 'urban') {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');

            const base = theme === 'desert' ? '#5a432b' :
                         theme === 'alpine' ? '#34483a' :
                         theme === 'airfield' ? '#35442f' :
                         theme === 'suzuka' ? '#303346' :
                         theme === 'harbor' ? '#18323c' : '#27313d';
            ctx.fillStyle = base;
            ctx.fillRect(0, 0, 256, 256);

            for (let i = 0; i < 3600; i++) {
                const x = Math.random() * 256;
                const y = Math.random() * 256;
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.18)';
                ctx.fillRect(x, y, 2, 2);
            }
            const tex = new THREE.CanvasTexture(canvas);
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(95, 95);
            return tex;
        }

        function createBuildingTexture(accentHex) {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#0b111e';
            ctx.fillRect(0, 0, 128, 256);

            ctx.fillStyle = '#151e33';
            ctx.fillRect(0, 0, 10, 256);
            ctx.fillRect(118, 0, 10, 256);

            for (let y = 14; y < 244; y += 16) {
                for (let x = 18; x < 108; x += 16) {
                    const lit = Math.random();
                    if (lit > 0.38) {
                        ctx.fillStyle = lit > 0.84 ? accentHex : (lit > 0.62 ? '#38bdf8' : '#1e3a5f');
                        ctx.fillRect(x, y, 10, 9);
                    } else {
                        ctx.fillStyle = '#070b14';
                        ctx.fillRect(x, y, 10, 9);
                    }
                }
            }

            const tex = new THREE.CanvasTexture(canvas);
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            return tex;
        }

        function createCheckeredTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            const size = 16;
            for (let y = 0; y < 64; y += size) {
                for (let x = 0; x < 256; x += size) {
                    ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? '#ffffff' : '#0f172a';
                    ctx.fillRect(x, y, size, size);
                }
            }
            const tex = new THREE.CanvasTexture(canvas);
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            return tex;
        }

        // ==========================================
        // 5. DISTINCT F1 CIRCUITS & THEMED WORLDS
        // ==========================================
        // ==========================================
        // TRACK TOPOLOGY & GRADE SEPARATION
        // ==========================================
        function findTrackCenterlineCrossings(samples) {
            const count = samples.length;
            const minGap = Math.max(18, Math.floor(count * 0.025));
            const crossings = [];

            function intersectSegments(a, b, c, d) {
                const rx = b.x - a.x, rz = b.z - a.z;
                const sx = d.x - c.x, sz = d.z - c.z;
                const denominator = rx * sz - rz * sx;
                if (Math.abs(denominator) < 1e-8) return null;

                const qx = c.x - a.x, qz = c.z - a.z;
                const t = (qx * sz - qz * sx) / denominator;
                const u = (qx * rz - qz * rx) / denominator;
                if (t <= 0.015 || t >= 0.985 || u <= 0.015 || u >= 0.985) return null;

                return { t, u, x: a.x + t * rx, z: a.z + t * rz };
            }

            for (let i = 0; i < count; i++) {
                const a = samples[i].pt;
                const b = samples[(i + 1) % count].pt;

                for (let j = i + minGap; j < count; j++) {
                    const routeGap = Math.min(j - i, count - (j - i));
                    if (routeGap < minGap) continue;

                    const c = samples[j].pt;
                    const d = samples[(j + 1) % count].pt;

                    if (Math.max(a.x, b.x) < Math.min(c.x, d.x) - 0.01 ||
                        Math.max(c.x, d.x) < Math.min(a.x, b.x) - 0.01 ||
                        Math.max(a.z, b.z) < Math.min(c.z, d.z) - 0.01 ||
                        Math.max(c.z, d.z) < Math.min(a.z, b.z) - 0.01) continue;

                    const hit = intersectSegments(a, b, c, d);
                    if (!hit) continue;

                    const firstT = (i + hit.t) / count;
                    const secondT = (j + hit.u) / count;
                    const overT = Math.min(firstT, secondT);
                    const underT = Math.max(firstT, secondT);

                    const duplicate = crossings.some(existing =>
                        Math.hypot(existing.x - hit.x, existing.z - hit.z) < 5 &&
                        Math.abs(existing.overT - overT) < 0.015 &&
                        Math.abs(existing.underT - underT) < 0.015
                    );
                    if (!duplicate) crossings.push({ x: hit.x, z: hit.z, overT, underT });
                }
            }

            return crossings;
        }

        function calculateTrackClearanceScales(samples, roadHalfWidth) {
            const count = samples.length;
            const scales = new Array(count).fill(1);
            const minRouteGap = Math.max(18, Math.floor(count * 0.025));
            const spread = 10;
            const minCenterlineGap = roadHalfWidth * 2 + 5;

            function applyLocalLimit(centerIndex, targetScale) {
                for (let offset = -spread; offset <= spread; offset++) {
                    const index = (centerIndex + offset + count) % count;
                    const normalized = Math.abs(offset) / spread;
                    const influence = 1 - normalized * normalized * (3 - 2 * normalized);
                    const localScale = 1 - (1 - targetScale) * influence;
                    scales[index] = Math.min(scales[index], localScale);
                }
            }

            for (let i = 0; i < count; i++) {
                const a = samples[i].pt;
                for (let j = i + minRouteGap; j < count; j++) {
                    const routeGap = Math.min(j - i, count - (j - i));
                    if (routeGap < minRouteGap) continue;

                    const b = samples[j].pt;
                    // Grade-separated decks are allowed to overlap in the XZ projection.
                    if (Math.abs(a.y - b.y) > 4) continue;

                    const distance = Math.hypot(a.x - b.x, a.z - b.z);
                    if (distance >= minCenterlineGap) continue;

                    // Leave a safety gap between parallel pieces of track.
                    const safeHalfWidth = Math.max(1.2, (distance - 3.0) * 0.5);
                    const targetScale = Math.min(1, safeHalfWidth / roadHalfWidth);
                    applyLocalLimit(i, targetScale);
                    applyLocalLimit(j, targetScale);
                }
            }

            return scales;
        }

        function getGradeSeparationHeight(progress, crossings) {
            const height = 14;
            const deckHalfLength = 0.012;
            const rampHalfLength = 0.07;
            let result = 0;

            for (const crossing of crossings) {
                const rawDistance = Math.abs(progress - crossing.overT);
                const distance = Math.min(rawDistance, 1 - rawDistance);
                if (distance >= rampHalfLength) continue;
                if (distance <= deckHalfLength) {
                    result = Math.max(result, height);
                    continue;
                }

                const t = (distance - deckHalfLength) / (rampHalfLength - deckHalfLength);
                const smooth = t * t * (3 - 2 * t);
                result = Math.max(result, height * (1 - smooth));
            }

            return result;
        }

        function buildWorldAndTrack({ deferScenery = false } = {}) {
            if (trackWorld) {
                trackWorld.traverse(obj => {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                        mats.forEach(mat => { if (mat.map) mat.map.dispose(); mat.dispose(); });
                    }
                });
                scene.remove(trackWorld);
            }
            trackWorld = new THREE.Group();
            scene.add(trackWorld);

            const trackConfig = TRACKS[selectedTrackId] || TRACKS['neon-city'];
            ROAD_HALF_WIDTH = trackConfig.roadWidth;
            WALL_OFFSET = trackConfig.wallOffset || ROAD_HALF_WIDTH + 1.5;

            scene.background = new THREE.Color(trackConfig.sky);
            scene.fog = new THREE.FogExp2(trackConfig.fog, trackConfig.fogDensity);

            const groundGeo = new THREE.PlaneGeometry(3200, 3200);
            const groundMat = new THREE.MeshStandardMaterial({
                map: createGroundTexture(trackConfig.theme),
                color: 0xffffff,
                roughness: 0.92,
                metalness: 0.08
            });
            const ground = new THREE.Mesh(groundGeo, groundMat);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -0.25;
            ground.receiveShadow = true;
            trackWorld.add(ground);

            const centerline = createTrackCenterline({
                points: trackConfig.points,
                sampleCount: TRACK_SAMPLES_COUNT
            });
            trackCurve = centerline.curve;
            trackSamples = centerline.samples;

            // A flat 2D centerline cannot represent a real circuit crossover.
            // Detect it from the actual spline samples and raise one branch.
            const gradeSeparatedCrossings = findTrackCenterlineCrossings(trackSamples);
            for (const sample of trackSamples) {
                sample.pt.y = getGradeSeparationHeight(sample.t, gradeSeparatedCrossings);
            }
            const clearanceScales = calculateTrackClearanceScales(trackSamples, ROAD_HALF_WIDTH);
            for (let i = 0; i < trackSamples.length; i++) {
                trackSamples[i].clearanceScale = clearanceScales[i];
            }

            // The centerline normal is already smooth and normalized. Do not
            // shrink the road merely because a corner is tight: that caused
            // visible pinches and made the road edge disagree with collisions.
            // Only the self-clearance pass may narrow a section where two
            // separate parts of the circuit run dangerously close together.
            for (let i = 0; i < TRACK_SAMPLES_COUNT; i++) {
                const current = trackSamples[i];
                current.right.copy(current.baseRight).normalize();
                current.miterScale = THREE.MathUtils.clamp(
                    current.clearanceScale ?? 1,
                    0.06,
                    1
                );
            }

            let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
            trackSamples.forEach(s => {
                if (s.pt.x < minX) minX = s.pt.x;
                if (s.pt.x > maxX) maxX = s.pt.x;
                if (s.pt.z < minZ) minZ = s.pt.z;
                if (s.pt.z > maxZ) maxZ = s.pt.z;
            });
            const maxSpan = Math.max(maxX - minX, maxZ - minZ);
            minimapBounds.scale = 126 / maxSpan;
            minimapBounds.centerX = (minX + maxX) / 2;
            minimapBounds.centerZ = (minZ + maxZ) / 2;

            buildTrackRibbonMeshes(trackConfig);
            buildStartFinishAndSectorGates(trackConfig);

            if (deferScenery) {
                // Let the first WebGL frame reach the browser before creating
                // hundreds of decorative meshes. Skip stale work if the user
                // changes circuit before the deferred task executes.
                const worldForScenery = trackWorld;
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        if (trackWorld === worldForScenery) buildSceneryOutsideTrack(trackConfig);
                    }, 0);
                });
            } else {
                buildSceneryOutsideTrack(trackConfig);
            }
        }

        function rebuildPhysicsTrack() {
            if (!physicsWorld) return;
            for (const collider of physicsTrackColliders) {
                physicsWorld.world.removeCollider(collider, true);
            }
            physicsTrackColliders = [];

            const positions = [];
            const indices = [];
            const railPositions = [];
            const railIndices = [];
            const count = trackSamples.length;
            const curbWidth = 1.05;
            const railOffset = 0.32;
            const railHeight = 0.98;

            for (let i = 0; i < count; i++) {
                const sample = trackSamples[i];
                const scale = THREE.MathUtils.clamp(sample.miterScale ?? 1, 0.06, 1);
                const half = ROAD_HALF_WIDTH * scale;
                const left = sample.pt.clone().addScaledVector(sample.right, -half);
                const right = sample.pt.clone().addScaledVector(sample.right, half);
                left.y += 0.058;
                right.y += 0.058;
                positions.push(left.x,left.y,left.z,right.x,right.y,right.z);

                const next = (i + 1) % count;
                const base = i * 2;
                const nextBase = next * 2;
                indices.push(base,base+1,nextBase,base+1,nextBase+1,nextBase);

                for (const side of [-1, 1]) {
                    const edgeA = sample.pt.clone().addScaledVector(sample.right, side * (half + curbWidth + railOffset));
                    const nextSample = trackSamples[next];
                    const nextScale = THREE.MathUtils.clamp(nextSample.miterScale ?? 1, 0.06, 1);
                    const nextHalf = ROAD_HALF_WIDTH * nextScale;
                    const edgeB = nextSample.pt.clone().addScaledVector(nextSample.right, side * (nextHalf + curbWidth + railOffset));
                    const baseIndex = railPositions.length / 3;
                    railPositions.push(
                        edgeA.x, edgeA.y + 0.02, edgeA.z,
                        edgeA.x, edgeA.y + railHeight, edgeA.z,
                        edgeB.x, edgeB.y + 0.02, edgeB.z,
                        edgeB.x, edgeB.y + railHeight, edgeB.z
                    );
                    railIndices.push(baseIndex,baseIndex+1,baseIndex+2,baseIndex+1,baseIndex+3,baseIndex+2);
                }
            }

            const roadCollider = physicsWorld.world.createCollider(
                physicsWorld.RAPIER.ColliderDesc.trimesh(
                    new Float32Array(positions),
                    new Uint32Array(indices)
                ).setFriction(1.35).setRestitution(0)
            );
            physicsTrackColliders.push(roadCollider);

            const railsCollider = physicsWorld.world.createCollider(
                physicsWorld.RAPIER.ColliderDesc.trimesh(
                    new Float32Array(railPositions),
                    new Uint32Array(railIndices)
                ).setFriction(0.55).setRestitution(0.12)
            );
            physicsTrackColliders.push(railsCollider);
        }

        function createPhysicsVehicle() {
            if (!physicsWorld || !playerCar) return;
            if (physicsVehicle) physicsVehicle.dispose();
            const start = trackSamples[0];
            const heading = Math.atan2(start.tangent.x, start.tangent.z);
            physicsVehicle = new VehicleController({
                physics: physicsWorld,
                spawn: { x: start.pt.x, y: start.pt.y + 0.56, z: start.pt.z, heading },
                visual: playerCar
            });
            physicsAccumulator = 0;
        }

        function buildTrackRibbonMeshes(trackConfig) {
            buildTrackGeometry({
                trackSamples,
                trackCurve,
                trackWorld,
                trackConfig,
                roadHalfWidth: ROAD_HALF_WIDTH,
                wallOffset: WALL_OFFSET,
                createAsphaltTexture
            });
        }

        function buildStartFinishAndSectorGates(trackConfig) {
            const startSample = trackSamples[0];
            const angle = Math.atan2(startSample.tangent.x, startSample.tangent.z);

            const gantryGroup = new THREE.Group();
            gantryGroup.position.copy(startSample.pt);
            gantryGroup.rotation.y = angle;

            const lineGeo = new THREE.PlaneGeometry(ROAD_HALF_WIDTH * 2, 4.6);
            const lineMat = new THREE.MeshStandardMaterial({
                map: createCheckeredTexture(),
                roughness: 0.6
            });
            const lineMesh = new THREE.Mesh(lineGeo, lineMat);
            lineMesh.rotation.x = -Math.PI / 2;
            lineMesh.position.y = 0.08;
            gantryGroup.add(lineMesh);

            // No decorative white grid plates: keep the start area clean.
            // The checkered start/finish line above is the only large painted marker.

            const pillarGeo = new THREE.BoxGeometry(1.8, 11.5, 2.2);
            const pillarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.25 });

            const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
            leftPillar.position.set(-WALL_OFFSET - 0.8, 5.75, 0);
            leftPillar.castShadow = true;
            gantryGroup.add(leftPillar);

            const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
            rightPillar.position.set(WALL_OFFSET + 0.8, 5.75, 0);
            rightPillar.castShadow = true;
            gantryGroup.add(rightPillar);

            const beamGeo = new THREE.BoxGeometry(WALL_OFFSET * 2 + 3.4, 2.5, 2.6);
            const beam = new THREE.Mesh(beamGeo, pillarMat);
            beam.position.set(0, 10.8, 0);
            beam.castShadow = true;
            gantryGroup.add(beam);

            const banner = new THREE.Mesh(
                new THREE.BoxGeometry(WALL_OFFSET * 2, 1.35, 2.75),
                new THREE.MeshBasicMaterial({ color: 0xFF6500 })
            );
            banner.position.set(0, 10.8, 0);
            gantryGroup.add(banner);

            // 5 Red F1 Start Lights on Gantry
            const lightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
            for (let l = -2; l <= 2; l++) {
                const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 10), lightMat);
                bulb.position.set(l * 2.4, 9.1, 1.35);
                gantryGroup.add(bulb);
            }

            trackWorld.add(gantryGroup);

            // Sector 1 (t = 0.33) and Sector 2 (t = 0.66) overhead arches
            [0.33, 0.66].forEach(tVal => {
                const idx = Math.floor(tVal * TRACK_SAMPLES_COUNT);
                const s = trackSamples[idx];
                const sAngle = Math.atan2(s.tangent.x, s.tangent.z);

                const arch = new THREE.Group();
                arch.position.copy(s.pt);
                arch.rotation.y = sAngle;

                const sPillarGeo = new THREE.BoxGeometry(0.9, 8.8, 1.0);
                const pL = new THREE.Mesh(sPillarGeo, pillarMat);
                pL.position.set(-WALL_OFFSET - 0.5, 4.4, 0);
                arch.add(pL);

                const pR = new THREE.Mesh(sPillarGeo, pillarMat);
                pR.position.set(WALL_OFFSET + 0.5, 4.4, 0);
                arch.add(pR);

                const topNeon = new THREE.Mesh(
                    new THREE.BoxGeometry(WALL_OFFSET * 2 + 1.8, 0.48, 0.8),
                    new THREE.MeshBasicMaterial({ color: trackConfig.railColor })
                );
                topNeon.position.set(0, 8.7, 0);
                arch.add(topNeon);

                trackWorld.add(arch);
            });
        }

        function isPointFarFromTrack(x, z, minClearance) {
            for (let i = 0; i < trackSamples.length; i += 3) {
                const pt = trackSamples[i].pt;
                const dx = x - pt.x;
                const dz = z - pt.z;
                if (dx * dx + dz * dz < minClearance * minClearance) {
                    return false;
                }
            }
            return true;
        }

        function buildSceneryOutsideTrack(trackConfig) {
            const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
            const lampBulbMat = new THREE.MeshBasicMaterial({ color: trackConfig.railColor });

            // Trackside Floodlights
            for (let i = 0; i < TRACK_SAMPLES_COUNT; i += 20) {
                const s = trackSamples[i];
                const angle = Math.atan2(s.tangent.x, s.tangent.z);
                const side = (i % 40 === 0) ? 1 : -1;
                const lampPos = s.pt.clone().addScaledVector(s.right, side * (WALL_OFFSET + 9));

                // Include the pole, arm and lamp head footprint in the clearance.
                if (!isPointFarFromTrack(lampPos.x, lampPos.z, WALL_OFFSET + 6)) continue;

                const lampGroup = new THREE.Group();
                lampGroup.position.set(lampPos.x, 0, lampPos.z);
                lampGroup.rotation.y = angle;

                const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 10, 8), poleMat);
                post.position.y = 5;
                post.castShadow = true;
                lampGroup.add(post);

                const arm = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.22, 0.25), poleMat);
                arm.position.set(-side * 1.5, 9.9, 0);
                lampGroup.add(arm);

                const bulb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.45), lampBulbMat);
                bulb.position.set(-side * 2.6, 9.75, 0);
                lampGroup.add(bulb);

                trackWorld.add(lampGroup);
            }

            // F1 Grandstands along main straight
            const standMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.4 });
            const roofStandMat = new THREE.MeshStandardMaterial({ color: 0xFF6500, metalness: 0.5, roughness: 0.3 });
            for (let i = 15; i <= 75; i += 20) {
                const s = trackSamples[i];
                const standFootprintRadius = 18;
                const standPos = s.pt.clone().addScaledVector(s.right, -(WALL_OFFSET + 31));
                if (!isPointFarFromTrack(standPos.x, standPos.z, WALL_OFFSET + standFootprintRadius + 6)) continue;
                const angle = Math.atan2(s.tangent.x, s.tangent.z);

                const stand = new THREE.Group();
                stand.position.set(standPos.x, 0, standPos.z);
                stand.rotation.y = angle;

                const tiers = new THREE.Mesh(new THREE.BoxGeometry(12, 9, 32), standMat);
                tiers.position.y = 4.5;
                tiers.castShadow = true;
                stand.add(tiers);

                const canopy = new THREE.Mesh(new THREE.BoxGeometry(15, 0.6, 33), roofStandMat);
                canopy.position.set(2, 10.5, 0);
                canopy.rotation.z = -0.15;
                stand.add(canopy);

                trackWorld.add(stand);
            }

            // Theme-Specific Environments
            const theme = trackConfig.theme;

            if (theme === 'urban' || theme === 'harbor' || theme === 'monaco') {
                const texA = createBuildingTexture('#00f0ff');
                const texB = createBuildingTexture(theme === 'monaco' ? '#f59e0b' : '#FF6500');
                const roofMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8 });
                const wallMatA = new THREE.MeshStandardMaterial({ map: texA, roughness: 0.52, metalness: 0.38 });
                const wallMatB = new THREE.MeshStandardMaterial({ map: texB, roughness: 0.52, metalness: 0.38 });
                const placedBuildings = [];
                const maxBuildings = theme === 'monaco' ? 280 : 220;

                for (let attempt = 0; attempt < maxBuildings; attempt++) {
                    const rx = (Math.random() - 0.5) * 1450;
                    const rz = (Math.random() - 0.5) * 1250;
                    const width = 20 + Math.random() * 24;
                    const depth = 20 + Math.random() * 24;
                    const height = theme === 'monaco' ? (35 + Math.random() * 95) : (48 + Math.random() * 135);
                    const radius = Math.max(width, depth) * 0.78;

                    if (!isPointFarFromTrack(rx, rz, WALL_OFFSET + radius + 12)) continue;

                    let overlaps = false;
                    for (const b of placedBuildings) {
                        const dx = rx - b.x, dz = rz - b.z;
                        if (dx * dx + dz * dz < (radius + b.r + 8) * (radius + b.r + 8)) { overlaps = true; break; }
                    }
                    if (overlaps) continue;
                    placedBuildings.push({
                        x: rx, z: rz, r: radius, width, depth, height,
                        accent: attempt % 3 === 0 ? 1 : 0
                    });
                }

                // Batch the skyline into a handful of InstancedMeshes instead
                // of hundreds of independent draw calls.
                const dummy = new THREE.Object3D();
                const buildingGeometry = new THREE.BoxGeometry(1, 1, 1);
                const crownGeometry = new THREE.BoxGeometry(1, 1, 1);
                const variants = [
                    { accent: 0, wall: wallMatA, crown: 0x00f0ff },
                    { accent: 1, wall: wallMatB, crown: theme === 'monaco' ? 0xf59e0b : 0xFF6500 }
                ];

                for (const variant of variants) {
                    const buildings = placedBuildings.filter(item => item.accent === variant.accent);
                    if (!buildings.length) continue;

                    const buildingMesh = new THREE.InstancedMesh(
                        buildingGeometry,
                        [variant.wall, variant.wall, roofMat, roofMat, variant.wall, variant.wall],
                        buildings.length
                    );
                    const crownMesh = new THREE.InstancedMesh(
                        crownGeometry,
                        new THREE.MeshBasicMaterial({ color: variant.crown }),
                        buildings.length
                    );

                    buildings.forEach((building, index) => {
                        dummy.position.set(building.x, building.height / 2, building.z);
                        dummy.rotation.set(0, 0, 0);
                        dummy.scale.set(building.width, building.height, building.depth);
                        dummy.updateMatrix();
                        buildingMesh.setMatrixAt(index, dummy.matrix);

                        dummy.position.set(building.x, building.height - 1.4, building.z);
                        dummy.scale.set(building.width + 0.6, 0.85, building.depth + 0.6);
                        dummy.updateMatrix();
                        crownMesh.setMatrixAt(index, dummy.matrix);
                    });

                    buildingMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
                    crownMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
                    buildingMesh.instanceMatrix.needsUpdate = true;
                    crownMesh.instanceMatrix.needsUpdate = true;
                    trackWorld.add(buildingMesh, crownMesh);
                }
            }

            if (theme === 'harbor') {
                const containerGeo = new THREE.BoxGeometry(26, 8, 11);
                const containerMaterials = [
                    new THREE.MeshStandardMaterial({color:0x0e7490, roughness:0.75}),
                    new THREE.MeshStandardMaterial({color:0x9a3412, roughness:0.75}),
                    new THREE.MeshStandardMaterial({color:0x334155, roughness:0.75})
                ];
                for (let i = 0; i < 48; i++) {
                    const rx = (Math.random() - 0.5) * 1400;
                    const rz = (Math.random() - 0.5) * 1150;
                    const containerFootprintRadius = 15;
                    if (!isPointFarFromTrack(rx, rz, WALL_OFFSET + containerFootprintRadius + 8)) continue;
                    const container = new THREE.Mesh(containerGeo, containerMaterials[i % containerMaterials.length]);
                    container.position.set(rx, 4 + (i % 4 === 0 ? 8 : 0), rz);
                    container.rotation.y = Math.round(Math.random()) * Math.PI / 2;
                    container.castShadow = true;
                    trackWorld.add(container);
                }
            }

            if (theme === 'desert' || theme === 'alpine' || theme === 'suzuka' || theme === 'airfield') {
                const rockColor = theme === 'desert' ? 0x9a5b2e :
                                  theme === 'alpine' ? 0x475569 :
                                  theme === 'suzuka' ? 0x3b1d5e : 0x1e3a2f;
                const mountainMat = new THREE.MeshStandardMaterial({ color: rockColor, roughness: 0.95 });
                const capMat = new THREE.MeshStandardMaterial({
                    color: theme === 'alpine' ? 0xe2e8f0 : theme === 'suzuka' ? 0xf472b6 : 0xc28554,
                    roughness: 0.9
                });

                for (let i = 0; i < 72; i++) {
                    const rx = (Math.random() - 0.5) * 1750;
                    const rz = (Math.random() - 0.5) * 1550;
                    const radius = theme === 'airfield' ? (22 + Math.random() * 35) : (32 + Math.random() * 68);
                    const height = theme === 'airfield' ? (14 + Math.random() * 24) : (45 + Math.random() * 130);
                    // The mountain's full base radius is included in the safety margin.
                    if (!isPointFarFromTrack(rx, rz, WALL_OFFSET + radius + 18)) continue;
                    const mountain = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 7), mountainMat);
                    mountain.position.set(rx, height / 2 - 1, rz);
                    mountain.rotation.y = Math.random() * Math.PI;
                    mountain.castShadow = true;
                    trackWorld.add(mountain);

                    if (theme === 'alpine' || theme === 'suzuka') {
                        const cap = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.46, height * 0.34, 7), capMat);
                        cap.position.set(rx, height * 0.82, rz);
                        cap.rotation.y = mountain.rotation.y;
                        trackWorld.add(cap);
                    }
                }
            }
        }

        // ==========================================
        // 6. DETAILED 3D HYPER-SPORTS / F1 PROTOTYPE CAR
        // ==========================================
        function resetPlayerToStart() {
            const s = trackSamples[0];
            player.pos.set(s.pt.x, s.pt.y, s.pt.z);
            player.heading = Math.atan2(s.tangent.x, s.tangent.z);
            player.velAngle = player.heading;
            player.speed = 0;
            player.nitro = 100; player.nitroLock = 0; player.nitroDelay = 0; player.nitroArmed = true;
            player.isNitro = false;
            player.isDrifting = false;
            player.steerInput = 0;
            player.trackT = 0;
            player.sector1Done = false;
            player.sector2Done = false;
            player.lapStartTime = 0;
            timerStarted = false;
            pausedElapsedMs = 0;

            document.getElementById('s1-display').innerText = '--.--';
            document.getElementById('s2-display').innerText = '--.--';
            document.getElementById('speed-lines').style.opacity = '0';

            if (physicsVehicle) {
                physicsVehicle.reset(
                    { x: s.pt.x, y: s.pt.y + 0.56, z: s.pt.z },
                    player.heading
                );
                physicsVehicle.syncVisual(1);
            } else {
                playerCar.mesh.position.copy(player.pos);
                playerCar.mesh.rotation.set(0, player.heading, 0);
            }
        }

        function recoverPlayerOnTrack() {
            const nearest = findNearestTrackSample(player.pos.x, player.pos.z, player.trackT);
            player.pos.set(nearest.pt.x, nearest.pt.y, nearest.pt.z);
            player.heading = Math.atan2(nearest.tangent.x, nearest.tangent.z);
            player.velAngle = player.heading;
            player.speed = 0;
            if (physicsVehicle) {
                physicsVehicle.reset(
                    { x: nearest.pt.x, y: nearest.pt.y + 0.56, z: nearest.pt.z },
                    player.heading
                );
                physicsVehicle.syncVisual(1);
            }
            showToast('REPOSICIONADO NO CENTRO DA PISTA');
        }

        // ==========================================
        // 7. PARTICLES (DRIFT SMOKE & NITRO SPARKS)
        // ==========================================
        // Reuse instanced particle pools: drifting no longer creates and destroys
        // dozens of individual meshes/materials every second.
        function spawnSmokeParticle(x, y, z, isNitroSpark = false) {
            if (!vfxSystem) return;
            smokeSpawnPosition.set(x, y, z);
            if (isNitroSpark) {
                vfxSystem.emitSparks(smokeSpawnPosition, sparkNormal, 1);
            } else {
                smokeSpawnVelocity.set(0, 0.6 + Math.random() * 0.8, 0);
                vfxSystem.emitSmoke(smokeSpawnPosition, smokeSpawnVelocity, 1);
            }
        }

        function updateParticles(dt) {
            vfxSystem?.update(dt);
        }

        // ==========================================
        // 8. REFINED F1 TELEMETRY PHYSICS & COLLISIONS
        // ==========================================
        function findNearestTrackSample(x, z, preferredT = null) {
            const count = trackSamples.length;
            let bestIdx = -1;
            let bestDistSq = Infinity;

            const testSample = index => {
                const sample = trackSamples[index];
                const dx = x - sample.pt.x;
                const dz = z - sample.pt.z;
                const distanceSq = dx * dx + dz * dz;
                if (distanceSq < bestDistSq) {
                    bestDistSq = distanceSq;
                    bestIdx = index;
                }
            };

            if (Number.isFinite(preferredT) && count > 0) {
                // Search a small window around the previous progress first. This
                // also prevents snapping to a nearby but different track segment.
                const center = Math.round(THREE.MathUtils.euclideanModulo(preferredT, 1) * count) % count;
                const radius = 18;
                for (let offset = -radius; offset <= radius; offset++) {
                    testSample((center + offset + count) % count);
                }
            }

            // Recover from teleport, track reset or a large deviation only when
            // the local window cannot find a plausible section of asphalt.
            if (bestIdx < 0 || bestDistSq > 484) {
                bestDistSq = Infinity;
                for (let i = 0; i < count; i++) testSample(i);
            }

            const nearest = trackSamples[bestIdx];
            nearest.index = bestIdx;
            nearest.dist = Math.sqrt(bestDistSq);
            return nearest;
        }

        function updatePlayerPhysics(dt) {
            if (!timerStarted && keys.w) {
                timerStarted = true;
                player.lapStartTime = performance.now();
                player.sector1Done = false; player.sector2Done = false;
                showToast('CRONÔMETRO INICIADO');
            }

            const nitroInput = keys.shift || keys.n;
            if (!nitroInput) player.nitroArmed = true;
            if (player.nitroLock > 0) player.nitroLock = Math.max(0, player.nitroLock - dt);
            const canIgnite = player.nitroLock <= 0 && player.nitroArmed && player.speed > 0.18 &&
                (player.isNitro || player.nitro >= NITRO_MIN_IGNITE);
            player.isNitro = nitroInput && canIgnite && player.nitro > 0;

            if (player.isNitro) {
                player.nitro = Math.max(0, player.nitro - dt * 26);
                player.nitroDelay = NITRO_RECHARGE_DELAY;
                if (player.nitro <= 0) {
                    player.isNitro = false;
                    player.nitroLock = NITRO_LOCK_TIME;
                    player.nitroArmed = false;
                    showToast('ERS / NITRO SUPERAQUECIDO!');
                }
                document.getElementById('speed-lines').style.opacity = '1';
            } else {
                if (player.nitroDelay > 0) player.nitroDelay = Math.max(0, player.nitroDelay - dt);
                if (player.nitroLock <= 0 && player.nitroDelay <= 0) {
                    const rechargeRate = player.isDrifting ? 30 : 10;
                    player.nitro = Math.min(100, player.nitro + dt * rechargeRate);
                }
                document.getElementById('speed-lines').style.opacity = '0';
            }

            // Rapier owns the active vehicle dynamics. Inputs are collected at
            // render rate, while suspension, wheel forces and collisions run at
            // a deterministic 120 Hz fixed timestep.
            const targetSteer = (keys.a ? 1 : 0) - (keys.d ? 1 : 0);
            const steerResponsiveness = player.isDrifting ? 15.5 : 13.5;
            player.steerInput += (targetSteer - player.steerInput) * Math.min(1, dt * steerResponsiveness);

            const signedSpeed = physicsVehicle ? physicsVehicle.speedKmh / 3.6 : 0;
            const braking = keys.s && signedSpeed > 0.8;
            const reversing = keys.s && signedSpeed <= 0.8;
            if (physicsVehicle) {
                physicsVehicle.tuning.engineForce = player.isNitro ? 14800 : 10500;
                physicsVehicle.setInput({
                    throttle: keys.w ? 1 : 0,
                    reverse: reversing ? 1 : 0,
                    brake: braking ? 1 : 0,
                    steer: player.steerInput,
                    handbrake: keys.space && Math.abs(signedSpeed) > 4 ? 1 : 0
                });

                physicsAccumulator = Math.min(
                    physicsAccumulator + dt,
                    PHYSICS_FIXED_STEP * 8
                );
                let substeps = 0;
                while (physicsAccumulator >= PHYSICS_FIXED_STEP && substeps < 8) {
                    const speedRatio = Math.min(1, Math.abs(physicsVehicle.speedKmh) / 400);
                    physicsVehicle.body.setLinearDamping(0.08 + speedRatio * speedRatio * 0.72);
                    physicsVehicle.preStep(PHYSICS_FIXED_STEP);
                    physicsWorld.step(PHYSICS_FIXED_STEP);
                    physicsVehicle.postStep();
                    physicsAccumulator -= PHYSICS_FIXED_STEP;
                    substeps++;
                }

                physicsVehicle.syncVisual(physicsAccumulator / PHYSICS_FIXED_STEP);
                player.pos.copy(playerCar.mesh.position);
                const vehicleEuler = new THREE.Euler().setFromQuaternion(
                    physicsVehicle.currentRotation,
                    'YXZ'
                );
                player.heading = vehicleEuler.y;
                const velocity = physicsVehicle.velocity;
                const planarSpeed = Math.hypot(velocity.x, velocity.z);
                player.velAngle = planarSpeed > 0.15
                    ? Math.atan2(velocity.x, velocity.z)
                    : player.heading;
                player.speed = physicsVehicle.speedKmh / SPEED_MULTIPLIER;
                player.isDrifting = physicsVehicle.isDrifting ||
                    (keys.space && planarSpeed > 4 && Math.abs(physicsVehicle.slipAngle) > 0.12);

                const nearestForGrip = findNearestTrackSample(player.pos.x, player.pos.z, player.trackT);
                const relative = new THREE.Vector3(
                    player.pos.x - nearestForGrip.pt.x,
                    0,
                    player.pos.z - nearestForGrip.pt.z
                );
                const lateral = relative.dot(nearestForGrip.right);
                const localScale = nearestForGrip.miterScale || 1;
                const roadEdge = ROAD_HALF_WIDTH * localScale;
                const runoff = Math.max(0, Math.abs(lateral) - roadEdge);
                if (runoff > 0.05) {
                    const depth = Math.min(1, runoff / (1.35 * localScale));
                    const drag = Math.exp(-(0.75 + depth * 0.35) * dt);
                    const velocityNow = physicsVehicle.body.linvel();
                    physicsVehicle.body.setLinvel({
                        x: velocityNow.x * drag,
                        y: velocityNow.y,
                        z: velocityNow.z * drag
                    }, true);
                }
            }

            document.getElementById('drift-bonus-tag').style.opacity = player.isDrifting ? '1' : '0.35';
            playerCar.tailMat.color.setHex(keys.s && braking ? 0xff1e42 : 0x7f1d1d);
            playerCar.flameL.visible = player.isNitro;
            playerCar.flameR.visible = player.isNitro;
            if (player.isNitro) {
                const flicker = 0.85 + Math.random() * 0.65;
                playerCar.flameL.scale.set(1.1, 1.1, flicker);
                playerCar.flameR.scale.set(1.1, 1.1, flicker);
            }

            const nearest = findNearestTrackSample(player.pos.x, player.pos.z, player.trackT);
            const angleDiff = player.heading - player.velAngle;
            const normalizedAngle = THREE.MathUtils.euclideanModulo(angleDiff + Math.PI, Math.PI * 2) - Math.PI;


            if (player.isDrifting && Math.random() < 0.65) {
                const rearLeft = new THREE.Vector3(-0.95, 0.25, -1.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.heading).add(player.pos);
                const rearRight = new THREE.Vector3(0.95, 0.25, -1.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.heading).add(player.pos);
                spawnSmokeParticle(rearLeft.x, rearLeft.y, rearLeft.z, false);
                spawnSmokeParticle(rearRight.x, rearRight.y, rearRight.z, false);
            }

            // Drift score
            if (player.isDrifting) {
                driftChainSeconds += dt;
                driftCombo = Math.min(5, 1 + Math.floor(driftChainSeconds / 2) * 0.5);
                const slip = Math.min(1, Math.abs(normalizedAngle) / 0.9);
                const speedFactor = Math.max(0, Math.abs(player.speed) * 35);
                driftScore += Math.round((8 + speedFactor * slip) * driftCombo * dt);
            } else {
                driftChainSeconds = Math.max(0, driftChainSeconds - dt * 2);
                driftCombo = Math.max(1, 1 + Math.floor(driftChainSeconds / 2) * 0.5);
            }
            document.getElementById('drift-score-display').innerText = Math.floor(driftScore).toLocaleString('pt-BR');
            document.getElementById('drift-combo-display').innerText = `x${driftCombo.toFixed(1)}`;



            // Sector & Lap Timing Logic
            const prevT = player.trackT;
            player.trackT = nearest.t;

            if (!player.sector1Done && prevT <= 0.33 && player.trackT > 0.33 && player.trackT < 0.5) {
                player.sector1Done = true;
                const s1Time = (performance.now() - player.lapStartTime) / 1000;
                document.getElementById('s1-display').innerText = `${s1Time.toFixed(2)}s`;
                sound.playChime(false);
            }

            if (player.sector1Done && !player.sector2Done && prevT <= 0.66 && player.trackT > 0.66 && player.trackT < 0.85) {
                player.sector2Done = true;
                const s2Time = (performance.now() - player.lapStartTime) / 1000;
                document.getElementById('s2-display').innerText = `${s2Time.toFixed(2)}s`;
                sound.playChime(false);
            }

            if (timerStarted && prevT > 0.88 && player.trackT < 0.12 && player.sector1Done && player.sector2Done) {
                onPlayerCompleteLap();
            }

            sound.update(Math.abs(player.speed) / NITRO_TOP_SPEED, player.isDrifting, player.isNitro);
        }

        function onPlayerCompleteLap() {
            const now = performance.now();
            const lapMs = now - player.lapStartTime;

            player.lapStartTime = now;
            player.sector1Done = false;
            player.sector2Done = false;
            document.getElementById('s1-display').innerText = '--.--';
            document.getElementById('s2-display').innerText = '--.--';

            player.lap++;
            document.getElementById('lap-display').innerText = `${player.lap}`;

            const isSessionBest = !player.bestLapMs || lapMs < player.bestLapMs;
            if (isSessionBest) {
                player.bestLapMs = lapMs;
                document.getElementById('best-display').innerText = formatTime(lapMs);
            }

            const currentRecords = loadRecords();
            const isAllTimeRecord = currentRecords.length === 0 || lapMs < currentRecords[0].timeMs;

            sound.playChime(isAllTimeRecord || isSessionBest);
            openSaveRecordModal(lapMs, isAllTimeRecord);
        }

        function openSaveRecordModal(lapMs, isNewWR = false) {
            gameState = 'MODAL';
            sound.update(0, false, false);
            document.getElementById('speed-lines').style.opacity = '0';
            clearInputKeys();

            player.pendingRecordTimeMs = lapMs;
            recordSavedForPending = false;
            const saveStatus = document.getElementById('record-save-status');
            saveStatus.className = 'hidden text-sm font-orbitron text-emerald-300 bg-emerald-500/10 border border-emerald-400/40 rounded-lg px-3 py-2 mb-4';
            saveStatus.textContent = '';
            const saveButton = document.getElementById('confirm-save-record-btn');
            saveButton.disabled = false;
            saveButton.textContent = 'SALVAR TEMPO';
            saveButton.classList.remove('opacity-60', 'cursor-not-allowed');
            document.getElementById('modal-lap-time').innerText = formatTime(lapMs);

            const estRank = getEstimatedRank(lapMs);
            document.getElementById('modal-rank-preview').innerText = `POSIÇÃO ESTIMADA NO RANKING: #${estRank}`;

            const badge = document.getElementById('modal-badge');
            if (isNewWR || estRank === 1) {
                badge.innerText = 'NOVO RECORDE ABSOLUTO DA PISTA!';
                badge.className = 'inline-block px-3 py-1 rounded-full bg-[#FF6500]/25 border border-[#FF6500] text-[#FF6500] font-orbitron text-xs tracking-widest mb-2';
            } else {
                badge.innerText = 'VOLTA VÁLIDA REGISTRADA!';
                badge.className = 'inline-block px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-orbitron text-xs tracking-widest mb-2';
            }

            const modal = document.getElementById('record-modal');
            modal.classList.remove('hidden');

            const input = document.getElementById('pilot-name-input');
            input.value = localProfile.name || '';
            input.readOnly = true;
            input.placeholder = 'Nome da conta';
            setTimeout(() => input.focus(), 60);
        }

        function closeRecordModalAndResume() {
            document.getElementById('record-modal').classList.add('hidden');
            recordSavedForPending = false;
            player.lapStartTime = performance.now();
            timerStarted = true;
            player.pendingRecordTimeMs = null;
            player.sector1Done = false;
            player.sector2Done = false;
            gameState = 'PLAYING';
        }

        // ==========================================
        // PAUSE & EXIT TO MAIN MENU CONTROLS
        // ==========================================
        function openPauseModal() {
            if (gameState !== 'PLAYING') return;
            gameState = 'PAUSED';
            sound.update(0, false, false);
            document.getElementById('speed-lines').style.opacity = '0';
            clearInputKeys();
            if (timerStarted) {
                pausedElapsedMs = performance.now() - player.lapStartTime;
            }
            const modal = document.getElementById('pause-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function resumeFromPause() {
            if (gameState !== 'PAUSED') return;
            const modal = document.getElementById('pause-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            if (timerStarted) {
                player.lapStartTime = performance.now() - pausedElapsedMs;
                }
            gameState = 'PLAYING';
            showToast('CORRIDA RETOMADA');
        }

        function exitToMainMenu() {
            sound.update(0, false, false);
            clearInputKeys();
            document.getElementById('pause-modal').classList.add('hidden');
            document.getElementById('pause-modal').classList.remove('flex');
            document.getElementById('record-modal').classList.add('hidden');
            document.getElementById('speed-lines').style.opacity = '0';

            resetPlayerToStart();
            player.lap = 1;
            document.getElementById('lap-display').innerText = '1';
            document.getElementById('timer-display').innerText = '00:00.00';

            gameState = 'MENU';
            document.getElementById('menu-overlay').classList.remove('hidden');
            renderTrackCards();
            renderLeaderboards();
            showToast('MENU PRINCIPAL');
        }

        // ==========================================
        // 9. CAMERA SYSTEM (CHASE, FAR, HOOD)
        // ==========================================
        // ==========================================
        // 10. HUD & 176x176 CIRCULAR MINIMAP RADAR
        // ==========================================
        function updateHUD(now) {
            const kmh = Math.round(Math.abs(player.speed) * SPEED_MULTIPLIER);
            document.getElementById('speed-display').innerText = kmh;

            // 7-Speed F1 Gearbox + Shift Lights
            let gear = 'N';
            let rpmRatio = 0;
            if (player.speed < -0.04) {
                gear = 'R';
                rpmRatio = Math.min(1, Math.abs(player.speed) / 0.65);
            } else if (kmh > 370) { gear = '7'; rpmRatio = (kmh - 370) / 85; }
            else if (kmh > 310) { gear = '6'; rpmRatio = (kmh - 310) / 60; }
            else if (kmh > 250) { gear = '5'; rpmRatio = (kmh - 250) / 60; }
            else if (kmh > 190) { gear = '4'; rpmRatio = (kmh - 190) / 60; }
            else if (kmh > 130) { gear = '3'; rpmRatio = (kmh - 130) / 60; }
            else if (kmh > 68)  { gear = '2'; rpmRatio = (kmh - 68) / 62; }
            else if (kmh > 3)   { gear = '1'; rpmRatio = kmh / 65; }
            document.getElementById('gear-display').innerText = gear;

            const litCount = Math.min(10, Math.max(0, Math.round(rpmRatio * 10)));
            const rpmBars = document.getElementById('rpm-lights').children;
            for (let i = 0; i < 10; i++) {
                if (i < litCount) {
                    rpmBars[i].style.backgroundColor = i < 4 ? '#22c55e' : (i < 7 ? '#FF6500' : '#00f0ff');
                    rpmBars[i].style.boxShadow = i >= 7 ? '0 0 8px #00f0ff' : 'none';
                } else {
                    rpmBars[i].style.backgroundColor = '#1e293b';
                    rpmBars[i].style.boxShadow = 'none';
                }
            }

            const nf = document.getElementById('nitro-fill'), nt = document.getElementById('nitro-text');
            nf.style.width = `${player.nitro}%`;
            const locked = player.nitroLock > 0, ready = !locked && player.nitro >= NITRO_MIN_IGNITE;
            nf.style.filter = locked ? 'grayscale(1) brightness(.7)' : 'none';
            nf.style.boxShadow = locked ? '0 0 10px #ef4444' : ready ? '0 0 14px #FF6500' : 'none';
            nf.style.opacity = locked ? (Math.floor(now / 150) % 2 ? '.45' : '1') : (ready ? '1' : '.6');
            nt.innerText = locked ? `SUPERAQUECIDO ${player.nitroLock.toFixed(1)}s` : (player.nitro < NITRO_MIN_IGNITE && !player.isNitro ? `CARREGANDO ${Math.round(player.nitro)}%` : `${Math.round(player.nitro)}%`);
            nt.style.color = locked ? '#ef4444' : '#FF6500';

            const lapElapsed = timerStarted ? now - player.lapStartTime : 0;
            document.getElementById('timer-display').innerText = formatTime(lapElapsed);
        }

        function worldToMinimap(wx, wz) {
            const cx = 88;
            const cy = 88;
            return {
                x: cx + (wx - minimapBounds.centerX) * minimapBounds.scale,
                y: cy + (wz - minimapBounds.centerZ) * minimapBounds.scale
            };
        }

        function updateMinimap() {
            const canvas = document.getElementById('minimap');
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 176, 176);

            ctx.strokeStyle = 'rgba(0, 240, 255, 0.14)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(88, 10);
            ctx.lineTo(88, 166);
            ctx.moveTo(10, 88);
            ctx.lineTo(166, 88);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(0, 240, 255, 0.65)';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            for (let i = 0; i < TRACK_SAMPLES_COUNT; i += 4) {
                const pt = trackSamples[i].pt;
                const m = worldToMinimap(pt.x, pt.z);
                if (i === 0) ctx.moveTo(m.x, m.y);
                else ctx.lineTo(m.x, m.y);
            }
            ctx.closePath();
            ctx.stroke();

            // Sector markers on minimap
            [0.33, 0.66].forEach(tVal => {
                const pt = trackSamples[Math.floor(tVal * TRACK_SAMPLES_COUNT)].pt;
                const sm = worldToMinimap(pt.x, pt.z);
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(sm.x, sm.y, 2.4, 0, Math.PI * 2);
                ctx.fill();
            });

            // Start/Finish line
            const startM = worldToMinimap(trackSamples[0].pt.x, trackSamples[0].pt.z);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(startM.x - 3.5, startM.y - 3.5, 7, 7);



            // Player directional arrow
            const pm = worldToMinimap(player.pos.x, player.pos.z);
            ctx.save();
            ctx.translate(pm.x, pm.y);
            ctx.rotate(-player.heading);
            ctx.fillStyle = '#FF6500';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(0, 6.8);
            ctx.lineTo(-5.0, -5.2);
            ctx.lineTo(0, -2.5);
            ctx.lineTo(5.0, -5.2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        function formatTime(ms) {
            const totalSec = Math.max(0, ms / 1000);
            const mins = Math.floor(totalSec / 60);
            const secs = Math.floor(totalSec % 60);
            const centis = Math.floor((totalSec % 1) * 100);
            return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
        }

        let toastTimeout = null;
        function showToast(msg) {
            const el = document.getElementById('center-toast');
            el.innerText = msg;
            el.style.opacity = '1';
            clearTimeout(toastTimeout);
            toastTimeout = setTimeout(() => {
                el.style.opacity = '0';
            }, 2200);
        }

        // ==========================================
        // 11. INITIALIZATION & MAIN LOOP
        // ==========================================
        function initThree() {
            const canvas = document.getElementById('game-canvas');
            scene = new THREE.Scene();
            vfxSystem = new VFXSystem(scene, { smokeCount: 96, sparkCount: 48, skidCapacity: 2400 });
            scene.background = new THREE.Color(0x060913);
            scene.fog = new THREE.FogExp2(0x060913, 0.0019);

            camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.4, 1600);
            cameraController = new CameraController(camera);

            renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: false,
                powerPreference: 'high-performance',
                stencil: false,
                depth: true
            });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
            renderer.setSize(window.innerWidth, window.innerHeight);
            // Large dynamic shadow maps were a major GPU cost across all seven tracks.
            // Keep the lighting, but disable real-time shadow rendering for a steadier frame rate.
            renderer.shadowMap.enabled = false;

            const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 1.0);
            scene.add(hemiLight);

            const dirLight = new THREE.DirectionalLight(0xe0f2fe, 1.4);
            dirLight.position.set(160, 260, 120);
            dirLight.castShadow = true;
            dirLight.shadow.mapSize.width = 1024;
            dirLight.shadow.mapSize.height = 1024;
            dirLight.shadow.camera.near = 20;
            dirLight.shadow.camera.far = 900;
            const d = 420;
            dirLight.shadow.camera.left = -d;
            dirLight.shadow.camera.right = d;
            dirLight.shadow.camera.top = d;
            dirLight.shadow.camera.bottom = -d;
            scene.add(dirLight);

            const starGeo = new THREE.BufferGeometry();
            const starPos = new Float32Array(1100 * 3);
            for (let i = 0; i < starPos.length; i += 3) {
                starPos[i] = (Math.random() - 0.5) * 2200;
                starPos[i + 1] = 150 + Math.random() * 380;
                starPos[i + 2] = (Math.random() - 0.5) * 2200;
            }
            starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
            scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xbae6fd, size: 1.6 })));

            // Start rendering before generating the decorative environment.
            // The first frame can now appear while scenery is built afterwards.
            startRenderLoop();
            buildWorldAndTrack({ deferScenery: true });

            playerCar = createSportsCarMesh();
            scene.add(playerCar.mesh);


            const previewCanvas = document.getElementById('garage-preview-canvas');
            previewScene = new THREE.Scene();
            previewScene.background = new THREE.Color(0x080d18);
            previewCamera = new THREE.PerspectiveCamera(38, 2, 0.1, 100);
            previewCamera.position.set(6.5, 4.0, 7.5);
            previewCamera.lookAt(0, 0.7, 0);
            previewRenderer = new THREE.WebGLRenderer({
                canvas: previewCanvas,
                antialias: false,
                alpha: false,
                powerPreference: 'low-power',
                stencil: false
            });
            previewRenderer.setPixelRatio(1);
            previewRenderer.setSize(420, 210, false);
            previewScene.add(new THREE.HemisphereLight(0x9be7ff, 0x172033, 1.8));
            const previewKey = new THREE.DirectionalLight(0xffffff, 2.0); previewKey.position.set(5, 8, 6); previewScene.add(previewKey);
            const previewFill = new THREE.PointLight(0x00f0ff, 1.4, 20); previewFill.position.set(-5, 3, -3); previewScene.add(previewFill);
            previewCar = createSportsCarMesh(); previewScene.add(previewCar.mesh);
            selectedBodyColor = localProfile.bodyColor || '#141820';
            selectedAccentColor = localProfile.accentColor || '#FF6500';
            applyCarCustomization();
            resetPlayerToStart();

            const initialCfg = TRACKS[selectedTrackId];
            document.getElementById('ranking-track-subtitle').innerText = `CIRCUITO: ${initialCfg.name}`;
            document.getElementById('hud-track-name').innerText = initialCfg.name;
            document.getElementById('hud-track-diff').innerText = initialCfg.difficulty;
            document.getElementById('hud-track-diff').className = `text-[10px] font-orbitron font-bold px-2 py-0.5 rounded border ${initialCfg.diffColor}`;
            document.getElementById('pause-track-title').innerText = initialCfg.name;

            renderTrackCards();
            renderLeaderboards();
            updateMinimap();

            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
                if (previewRenderer) {
                    const canvas = document.getElementById('garage-preview-canvas');
                    const w = Math.max(280, canvas.clientWidth || 640), h = Math.max(180, canvas.clientHeight || 208);
                    previewRenderer.setSize(w, h, false); previewCamera.aspect = w / h; previewCamera.updateProjectionMatrix();
                }
            });

            setupInputListeners();
        }

        function setupInputListeners() {
            window.addEventListener('keydown', e => {
                if (document.activeElement === document.getElementById('pilot-name-input')) {
                    if (e.code === 'Enter') {
                        document.getElementById('confirm-save-record-btn').click();
                    }
                    return;
                }

                if (e.code === 'Escape') {
                    if (gameState === 'PLAYING') {
                        e.preventDefault();
                        openPauseModal();
                        return;
                    } else if (gameState === 'PAUSED') {
                        e.preventDefault();
                        resumeFromPause();
                        return;
                    }
                }

                if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.w = true;
                if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.s = true;
                if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.a = true;
                if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = true;
                if (e.code === 'Space') {
                    keys.space = true;
                    if (gameState === 'PLAYING') e.preventDefault();
                }
                if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.shift = true;
                if (e.code === 'KeyN') keys.n = true;

                if (e.code === 'KeyC' && gameState === 'PLAYING') {
                    cameraMode = (cameraMode + 1) % 3;
                    showToast(`CÂMERA: ${CAMERA_NAMES[cameraMode]}`);
                }
                if (e.code === 'KeyR' && gameState === 'PLAYING') {
                    recoverPlayerOnTrack();
                }
                if (e.code === 'Tab' && gameState === 'PLAYING') {
                    e.preventDefault();
                    resetPlayerToStart();
                    showToast('VOLTA REINICIADA');
                }
            });

            window.addEventListener('keyup', e => {
                if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.w = false;
                if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.s = false;
                if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.a = false;
                if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = false;
                if (e.code === 'Space') keys.space = false;
                if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.shift = false;
                if (e.code === 'KeyN') keys.n = false;
            });

            // HUD & Pause Menu buttons
            document.getElementById('hud-pause-btn').addEventListener('click', openPauseModal);
            document.getElementById('hud-restart-btn').addEventListener('click', () => {
                if (gameState !== 'PLAYING') return;
                resetPlayerToStart();
                showToast('VOLTA REINICIADA');
            });
            document.getElementById('pause-resume-btn').addEventListener('click', resumeFromPause);
            document.getElementById('pause-restart-btn').addEventListener('click', () => {
                document.getElementById('pause-modal').classList.add('hidden');
                document.getElementById('pause-modal').classList.remove('flex');
                resetPlayerToStart();
                gameState = 'PLAYING';
                showToast('VOLTA REINICIADA');
            });
            document.getElementById('pause-exit-menu-btn').addEventListener('click', exitToMainMenu);

            document.getElementById('start-btn').addEventListener('click', startTimeTrial);
            document.getElementById('login-btn').addEventListener('click', () => authenticate('login'));
            document.getElementById('register-btn').addEventListener('click', () => authenticate('register'));
            document.getElementById('auth-password').addEventListener('keydown', e => { if(e.key==='Enter') authenticate('login'); });
            document.getElementById('return-own-garage-btn').addEventListener('click', openGarage);
            document.getElementById('logout-btn').addEventListener('click', async () => {
                try { await fetch('/api/auth', {method:'DELETE'}); } catch {}
                authToken = '';
                document.getElementById('start-btn').disabled = true;
                document.getElementById('start-btn').classList.add('opacity-50');
                document.getElementById('logout-btn').classList.add('hidden');
                document.getElementById('auth-status').textContent = 'Você saiu da conta. Entre novamente para jogar.';
                document.getElementById('auth-status').className = 'text-[11px] text-slate-400 mt-2';
                document.getElementById('auth-password').value = '';
            });
            document.getElementById('track-select').value = selectedTrackId;
            document.getElementById('track-select').addEventListener('change', e => selectTrack(e.target.value));
            document.getElementById('open-garage-btn').addEventListener('click', openGarage);
            document.getElementById('close-garage-btn').addEventListener('click', closeGarage);
            document.getElementById('save-garage-btn').addEventListener('click', saveGarage);
            document.querySelectorAll('.color-swatch').forEach(b=>b.addEventListener('click',()=>{selectedBodyColor=b.dataset.color;applyCarCustomization();}));
            document.querySelectorAll('.accent-swatch').forEach(b=>b.addEventListener('click',()=>{selectedAccentColor=b.dataset.color;applyCarCustomization();}));
            document.getElementById('ranking-period').addEventListener('change', e=>{rankingPeriod=e.target.value;refreshRecordsFromApi();});

            document.getElementById('hud-save-btn').addEventListener('click', () => {
                if (gameState !== 'PLAYING') return;
                if (!player.bestLapMs) {
                    showToast('COMPLETE UMA VOLTA PRIMEIRO PARA SALVAR!');
                    return;
                }
                openSaveRecordModal(player.bestLapMs, false);
            });

            document.getElementById('confirm-save-record-btn').addEventListener('click', async () => {
                const nameVal = document.getElementById('pilot-name-input').value;
                const saveButton = document.getElementById('confirm-save-record-btn');
                const saveStatus = document.getElementById('record-save-status');
                if (!player.pendingRecordTimeMs || recordSavedForPending || saveButton.disabled) return;
                saveButton.disabled = true;
                saveButton.textContent = 'SALVANDO...';
                saveButton.classList.add('opacity-60', 'cursor-not-allowed');
                try {
                    const rank = await saveNewRecord(nameVal, player.pendingRecordTimeMs);
                    recordSavedForPending = true;
                    saveStatus.textContent = lastSaveSynced
                        ? '✓ RECORDE SALVO.'
                        : '⚠ RECORDE SALVO LOCALMENTE. AGUARDANDO CONEXÃO.';
                    saveStatus.classList.toggle('text-red-300', !lastSaveSynced); saveStatus.classList.toggle('text-emerald-300', lastSaveSynced);
                    saveStatus.classList.remove('hidden');
                    saveButton.textContent = 'RECORDE SALVO';
                    showToast(lastSaveSynced ? 'RECORDE SALVO NO BANCO!' : 'RECORDE PENDENTE DE ENVIO');
                } catch (error) {
                    saveStatus.textContent = error.message || 'NÃO FOI POSSÍVEL SALVAR O RECORDE. TENTE NOVAMENTE.';
                    saveStatus.classList.remove('hidden');
                    saveStatus.classList.remove('text-emerald-300');
                    saveStatus.classList.add('text-red-300');
                    saveButton.disabled = false;
                    saveButton.textContent = 'TENTAR NOVAMENTE';
                    saveButton.classList.remove('opacity-60', 'cursor-not-allowed');
                }
            });

            document.getElementById('continue-racing-btn').addEventListener('click', () => {
                closeRecordModalAndResume();
            });

            document.getElementById('record-menu-btn').addEventListener('click', () => {
                exitToMainMenu();
                document.getElementById('pilot-name-input').value = '';
            });
        }

        function startTimeTrial() {
            if (!authToken) { showToast('ENTRE NA SUA CONTA ANTES DE JOGAR'); return; }
            sound.init();
            document.getElementById('menu-overlay').classList.add('hidden');
            document.getElementById('record-modal').classList.add('hidden');
            document.getElementById('pause-modal').classList.add('hidden');
            document.getElementById('pause-modal').classList.remove('flex');

            player.lap = 1;
            player.bestLapMs = null;
            document.getElementById('lap-display').innerText = '1';
            document.getElementById('best-display').innerText = '--:--.--';

            resetPlayerToStart();
            timerStarted = false;
            driftScore = 0; driftCombo = 1; driftChainSeconds = 0;
            gameState = 'PLAYING';
            showToast(`VALENDO! ${TRACKS[selectedTrackId].name} · ACELERE PARA INICIAR O TEMPO`);
        }

        let prevFrameTime = 0;
        let lastHudUpdate = 0;
        let lastMinimapUpdate = 0;
        let lastPreviewRender = 0;
        let animationStarted = false;
        function startRenderLoop() {
            if (animationStarted) return;
            animationStarted = true;
            requestAnimationFrame(animate);
        }
        function animate(now) {
            requestAnimationFrame(animate);
            if (!prevFrameTime) prevFrameTime = now;
            const dt = Math.min(0.05, (now - prevFrameTime) / 1000);
            prevFrameTime = now;

            if (gameState === 'PLAYING') {
                updatePlayerPhysics(dt);
                updateParticles(dt);
                cameraShake = cameraController.update(player, cameraMode, dt, cameraShake, NITRO_TOP_SPEED);
                if (now - lastHudUpdate >= 50) { updateHUD(now); lastHudUpdate = now; }
                if (now - lastMinimapUpdate >= 80) { updateMinimap(); lastMinimapUpdate = now; }
            } else if (gameState === 'PAUSED') {
                // Freeze simulation while paused
            } else {
                const t = now * 0.00025;
                camera.position.set(
                    player.pos.x + Math.cos(t) * 24,
                    10,
                    player.pos.z + Math.sin(t) * 24
                );
                camera.lookAt(player.pos.x + 10, 2, player.pos.z);
            }

            renderer.render(scene, camera);
            if (previewRenderer && previewScene && previewCamera && previewCar &&
                now - lastPreviewRender >= 33 &&
                !document.getElementById('garage-modal').classList.contains('hidden')) {
                const previewDt = lastPreviewRender ? Math.min(0.05, (now - lastPreviewRender) / 1000) : 0;
                previewCar.mesh.rotation.y += previewDt * 0.21;
                previewRenderer.render(previewScene, previewCamera);
                lastPreviewRender = now;
            }
        }

        let bootStarted = false;
        async function bootGame() {
            if (bootStarted) return;
            bootStarted = true;

            const startButton = document.getElementById('start-btn');
            const authStatus = document.getElementById('auth-status');

            try {
                // Bring up the renderer before waiting for physics or network requests.
                // A slow auth/records API must never leave the canvas black.
                initThree();
                startRenderLoop();

                physicsWorld = await PhysicsWorld.create({ fixedTimeStep: PHYSICS_FIXED_STEP });
                physicsWorld.createGround({ size: 3200, height: -0.36, friction: 1.1 });
                rebuildPhysicsTrack();
                createPhysicsVehicle();
                resetPlayerToStart();

                // These are background tasks; neither one is allowed to block rendering.
                void restoreSession();
                void refreshRecordsFromApi();
            } catch (error) {
                console.error('[Cyber Drift] Falha ao inicializar a física:', error);
                if (startButton) {
                    startButton.disabled = true;
                    startButton.classList.add('opacity-50');
                }
                if (authStatus) {
                    authStatus.textContent = 'Falha ao iniciar a física do jogo. Atualize a página; se persistir, verifique o console.';
                    authStatus.className = 'text-[11px] text-red-300 mt-2';
                }
                // If physics fails, keep the scene rendering so the user sees
                // an actionable error instead of a permanently black screen.
                if (renderer && scene && camera) {
                    startRenderLoop();
                } else {
                    try {
                        initThree();
                        startRenderLoop();
                    } catch (renderError) {
                        console.error('[Cyber Drift] Falha ao iniciar o renderizador:', renderError);
                    }
                }
            }
        }

        if (document.readyState === 'complete') {
            void bootGame();
        } else {
            window.addEventListener('load', () => { void bootGame(); }, { once: true });
        }