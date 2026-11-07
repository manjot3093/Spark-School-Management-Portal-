import { useEffect, useRef, useState } from 'react';
import type * as ThreeTypes from 'three';

const moduleNames = ['Attendance', 'Fees', 'Timetable', 'Reports', 'Library', 'Transport', 'Students'] as const;

/** Helper to generate procedural canvas textures for the 3D planet dome */
function createPlanetTextures() {
  // Day Mode: 3D Earth Canvas (1024x512)
  const earthCanvas = document.createElement('canvas');
  earthCanvas.width = 1024;
  earthCanvas.height = 512;
  const ectx = earthCanvas.getContext('2d');
  if (ectx) {
    // Deep Ocean with spherical gradient
    const oceanGrad = ectx.createLinearGradient(0, 0, 0, 512);
    oceanGrad.addColorStop(0, '#1b5cb0');
    oceanGrad.addColorStop(0.35, '#145a8e');
    oceanGrad.addColorStop(0.7, '#0d2850');
    oceanGrad.addColorStop(1, '#081c3b');
    ectx.fillStyle = oceanGrad;
    ectx.fillRect(0, 0, 1024, 512);

    // Helper to draw continent curves
    const drawLandmass = (pts: [number, number][], fill: string) => {
      ectx.fillStyle = fill;
      ectx.beginPath();
      ectx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        const xc = (pts[i][0] + pts[(i + 1) % pts.length][0]) / 2;
        const yc = (pts[i][1] + pts[(i + 1) % pts.length][1]) / 2;
        ectx.quadraticCurveTo(pts[i][0], pts[i][1], xc, yc);
      }
      ectx.closePath();
      ectx.fill();
    };

    // Eurasia & Africa (lush greens and golden savannas)
    drawLandmass([
      [480, 80], [560, 55], [680, 65], [790, 105], [760, 190], [690, 230],
      [630, 200], [590, 250], [550, 350], [500, 380], [460, 315], [430, 215],
      [410, 145], [445, 95]
    ], '#276f3f');

    // Sahara / Middle East golden desert tone
    drawLandmass([
      [490, 175], [565, 170], [620, 185], [590, 245], [535, 250], [480, 220]
    ], '#c49339');

    // Americas
    drawLandmass([
      [175, 75], [265, 85], [295, 140], [245, 205], [275, 245], [325, 295],
      [315, 395], [265, 445], [240, 370], [225, 270], [175, 205], [145, 130]
    ], '#236b3b');

    // Amazon basin lush deep emerald
    drawLandmass([
      [250, 280], [305, 305], [295, 360], [245, 345], [235, 300]
    ], '#19552c');

    // Australia & Pacific Archipelago
    drawLandmass([
      [780, 310], [860, 320], [885, 380], [825, 410], [765, 380], [755, 330]
    ], '#357c4c');

    // Coastal shallow waters turquoise/cyan glow
    ectx.strokeStyle = 'rgba(56, 189, 248, 0.42)';
    ectx.lineWidth = 6;
    ectx.stroke();

    // Swirling atmospheric white clouds
    ectx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    ectx.lineWidth = 18;
    ectx.lineCap = 'round';
    ectx.beginPath();
    ectx.arc(520, 210, 175, 0.1, 1.8);
    ectx.stroke();
    ectx.beginPath();
    ectx.arc(260, 250, 135, 0.2, 1.9);
    ectx.stroke();
    ectx.beginPath();
    ectx.arc(750, 180, 110, 0.5, 2.2);
    ectx.stroke();

    // Dappled fine clouds
    for (let i = 0; i < 40; i++) {
      const cx = ((i * 179.3) % 960) + 30;
      const cy = ((i * 61.7) % 400) + 40;
      ectx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ectx.beginPath();
      ectx.arc(cx, cy, 14 + (i % 7) * 4, 0, Math.PI * 2);
      ectx.fill();
    }
  }

  // Dark Mode: 3D Moon Canvas (1024x512)
  const moonCanvas = document.createElement('canvas');
  moonCanvas.width = 1024;
  moonCanvas.height = 512;
  const mctx = moonCanvas.getContext('2d');
  if (mctx) {
    // Base lunar regolith grey gradient
    const moonGrad = mctx.createLinearGradient(0, 0, 0, 512);
    moonGrad.addColorStop(0, '#8a9aaf');
    moonGrad.addColorStop(0.35, '#6f7e92');
    moonGrad.addColorStop(0.7, '#4e5a6c');
    moonGrad.addColorStop(1, '#3b4656');
    mctx.fillStyle = moonGrad;
    mctx.fillRect(0, 0, 1024, 512);

    // Lunar Maria (Dark basaltic plains / ancient lava seas)
    const maria = [
      { x: 380, y: 190, r: 120, col: '#323a47' }, // Sea of Serenity
      { x: 520, y: 160, r: 145, col: '#2c3440' }, // Sea of Tranquility
      { x: 670, y: 220, r: 110, col: '#303844' }, // Sea of Crises
      { x: 250, y: 250, r: 160, col: '#333b49' }, // Ocean of Storms
      { x: 420, y: 340, r: 105, col: '#2f3745' }, // Sea of Clouds
      { x: 780, y: 300, r: 90,  col: '#353e4b' },
      { x: 140, y: 170, r: 85,  col: '#313946' },
    ];
    maria.forEach(m => {
      const grad = mctx.createRadialGradient(m.x, m.y, m.r * 0.15, m.x, m.y, m.r);
      grad.addColorStop(0, m.col);
      grad.addColorStop(0.7, m.col);
      grad.addColorStop(1, 'transparent');
      mctx.fillStyle = grad;
      mctx.beginPath();
      mctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      mctx.fill();
    });

    // Ray craters (Tycho style bright radiating ejecta rays)
    const rayCenters = [{ x: 470, y: 380 }, { x: 740, y: 180 }, { x: 220, y: 280 }];
    rayCenters.forEach(rc => {
      mctx.strokeStyle = 'rgba(235, 243, 255, 0.18)';
      mctx.lineWidth = 1.5;
      for (let a = 0; a < 16; a++) {
        const angle = (a * Math.PI) / 8 + 0.1;
        const length = 90 + (a % 5) * 35;
        mctx.beginPath();
        mctx.moveTo(rc.x, rc.y);
        mctx.lineTo(rc.x + Math.cos(angle) * length, rc.y + Math.sin(angle) * length);
        mctx.stroke();
      }
    });

    // Realistic Impact Craters with sunlit rims & deep shadows
    const craters = [
      { x: 470, y: 380, r: 24 }, // Tycho
      { x: 310, y: 210, r: 28 }, // Copernicus
      { x: 260, y: 155, r: 22 }, // Kepler
      { x: 610, y: 190, r: 20 },
      { x: 500, y: 270, r: 18 },
      { x: 720, y: 330, r: 25 },
      { x: 180, y: 360, r: 22 },
      { x: 840, y: 160, r: 19 },
      { x: 370, y: 110, r: 16 },
      { x: 590, y: 90,  r: 15 },
    ];
    // Add procedural smaller craters
    for (let i = 0; i < 45; i++) {
      craters.push({
        x: ((i * 127.3) % 940) + 40,
        y: ((i * 83.1) % 430) + 40,
        r: 4 + (i % 8) * 1.8,
      });
    }

    craters.forEach(c => {
      // Dark inner shadow
      mctx.fillStyle = 'rgba(18, 22, 29, 0.72)';
      mctx.beginPath();
      mctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      mctx.fill();

      // Bright highlighted rim (sun coming from upper-right)
      mctx.strokeStyle = 'rgba(240, 246, 255, 0.85)';
      mctx.lineWidth = Math.max(1.2, c.r * 0.16);
      mctx.beginPath();
      mctx.arc(c.x, c.y, c.r, -Math.PI * 0.75, Math.PI * 0.25);
      mctx.stroke();

      // Shadowed opposite rim
      mctx.strokeStyle = 'rgba(8, 11, 16, 0.65)';
      mctx.beginPath();
      mctx.arc(c.x, c.y, c.r, Math.PI * 0.25, Math.PI * 1.25);
      mctx.stroke();

      // Central crater peak for large craters
      if (c.r > 16) {
        mctx.fillStyle = 'rgba(235, 242, 255, 0.75)';
        mctx.beginPath();
        mctx.arc(c.x + 1, c.y - 1, c.r * 0.18, 0, Math.PI * 2);
        mctx.fill();
      }
    });

    // Fine lunar dust speckles
    for (let i = 0; i < 90; i++) {
      const sx = ((i * 163.7) % 980) + 20;
      const sy = ((i * 97.1) % 470) + 20;
      mctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.22)' : 'rgba(10, 15, 25, 0.35)';
      mctx.beginPath();
      mctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      mctx.fill();
    }
  }

  return { earthCanvas, moonCanvas };
}

/** A self-contained 3D school campus viewer with dynamic Day (3D Earth & Clouds) and Dark (3D Moon & Stars) modes. */
export default function LoginSchoolScene() {
  const canvasHost = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    const host = canvasHost.current;
    if (!host) return;

    let disposed = false;
    let disposeScene = () => {};

    async function initialize() {
      try {
        const [THREE, { GLTFLoader }] = await Promise.all([
          import('three'),
          import('three/addons/loaders/GLTFLoader.js'),
        ]);
        if (disposed || !host) return;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;
        renderer.setClearColor(0x000000, 0);
        renderer.shadowMap.enabled = true;
        host.appendChild(renderer.domElement);
        disposeScene = () => { renderer.dispose(); renderer.domElement.remove(); };

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        scene.add(camera);
        // Powerful hemisphere for vivid sky + ground bounce
        const ambient = new THREE.HemisphereLight(0xfff0e0, 0x9db4e6, 0.90);
        const key = new THREE.DirectionalLight(0xfff3e6, 1.3);
        key.position.set(6, 10, 8);
        key.castShadow = true;
        // Warm accent from front to illuminate planet dome
        const accent = new THREE.PointLight(0xf07a2b, 0.65, 18);
        accent.position.set(0, 3, 4);
        // Fill light from below to brighten dome base
        const fill = new THREE.PointLight(0x60b0ff, 0.4, 20);
        fill.position.set(0, -2, 6);
        scene.add(ambient, key, accent, fill);

        const gltf = await new GLTFLoader().loadAsync('/models/spark-school.glb');
        if (disposed) { renderer.dispose(); renderer.domElement.remove(); return; }
        const model = gltf.scene;
        // Decrease size of the school house (~18% reduction for balanced composition)
        model.scale.setScalar(0.82);
        const hub = model.getObjectByName('SparkCampusHub');
        if (!hub) throw new Error('Spark campus root was not found');
        const campus = model.getObjectByName('Campus');
        scene.add(model);

        // 3D Semicircular Base: 3D Earth in Day Mode, 3D Moon in Dark Mode
        const { earthCanvas, moonCanvas } = createPlanetTextures();
        const earthTexture = new THREE.CanvasTexture(earthCanvas);
        earthTexture.wrapS = THREE.RepeatWrapping;
        const moonTexture = new THREE.CanvasTexture(moonCanvas);
        moonTexture.wrapS = THREE.RepeatWrapping;

        const domeRadius = 5.25;
        const domeGeometry = new THREE.SphereGeometry(domeRadius, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.45);
        const domeMaterial = new THREE.MeshStandardMaterial({
          map: earthTexture,
          roughness: 0.65,
          metalness: 0.15,
        });
        const planetDome = new THREE.Mesh(domeGeometry, domeMaterial);
        planetDome.position.set(0, 0.02, 0);
        hub.add(planetDome);

        // Atmospheric Horizon Rim Glow (Cyan glow for Earth, Silver-blue for Moon)
        const rimGeometry = new THREE.RingGeometry(domeRadius * 0.98, domeRadius * 1.14, 64);
        const rimMaterial = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.78,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const atmosphereRim = new THREE.Mesh(rimGeometry, rimMaterial);
        atmosphereRim.rotation.x = -Math.PI / 2;
        atmosphereRim.position.set(0, 0.05, 0);
        hub.add(atmosphereRim);

        // Galaxy / Sky container relative to camera
        const galaxy = new THREE.Group();
        camera.add(galaxy);

        // Stars in Dark Mode: from the top of the left card down to the top of the house
        const starCount = 380;
        const stars = new Float32Array(starCount * 3);
        for (let index = 0; index < starCount; index++) {
          const seed = index + 1;
          const random = (offset: number) => {
            const value = Math.sin(seed * 127.1 + offset * 311.7) * 43758.5453;
            return value - Math.floor(value);
          };
          // Spread across horizontally, biased slightly to top-left
          stars[index * 3] = (random(1) - 0.55) * 34;
          // Positioned from top of sky (y = 13.5) down to top of house (y = 0.5)
          stars[index * 3 + 1] = 0.5 + random(2) * 13;
          // Depth behind the campus scene
          stars[index * 3 + 2] = -23 - random(3) * 11;
        }
        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
        const starMaterial = new THREE.PointsMaterial({
          color: 0xffffff,
          size: 0.22,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
        });
        const starField = new THREE.Points(starGeometry, starMaterial);
        galaxy.add(starField);

        // Procedural 3D Fluffy Clouds for Day mode with soft grey shading for realistic volume
        const daySkyGroup = new THREE.Group();
        camera.add(daySkyGroup);

        const cloudMaterial = new THREE.MeshStandardMaterial({
          color: 0xf5f8ff,
          roughness: 0.88,
          metalness: 0.0,
          transparent: true,
          opacity: 0.96,
          depthWrite: false,
        });
        const cloudShadeMaterial = new THREE.MeshStandardMaterial({
          color: 0xd8e4f2,
          roughness: 0.95,
          metalness: 0.0,
          transparent: true,
          opacity: 0.88,
          depthWrite: false,
        });

        const puffGeometry = new THREE.SphereGeometry(1, 14, 10);
        interface CloudCluster {
          group: ThreeTypes.Group;
          speed: number;
          baseY: number;
          initialX: number;
        }
        const cloudClusters: CloudCluster[] = [];

        const cloudConfigs = [
          { x: -9,   y: 5.6, z: -22, speed: 0.32, scale: 1.1 },
          { x: 3.5,  y: 7.0, z: -23, speed: 0.24, scale: 1.3 },
          { x: 11.5, y: 4.8, z: -21, speed: 0.38, scale: 0.95 },
          { x: -3.5, y: 8.2, z: -24, speed: 0.20, scale: 1.15 },
          { x: 7.0,  y: 6.3, z: -22, speed: 0.28, scale: 1.0 },
        ];

        cloudConfigs.forEach((cfg) => {
          const cluster = new THREE.Group();
          // Top puffs: crisp white
          const mainPuffs = [
            { x: 0,     y: 0,    z: 0,    s: 1.0,  mat: cloudMaterial },
            { x: 0.85,  y: 0.08, z: 0.1,  s: 0.78, mat: cloudMaterial },
            { x: -0.85, y:-0.05, z:-0.1,  s: 0.75, mat: cloudMaterial },
            { x: 0.38,  y: 0.42, z: 0.08, s: 0.80, mat: cloudMaterial },
            { x:-0.42,  y: 0.32, z: 0.05, s: 0.70, mat: cloudMaterial },
          ];
          // Bottom puffs: subtle greyish shading for true 3D depth
          const shadePuffs = [
            { x: 0,     y:-0.32, z:-0.05, s: 0.65, mat: cloudShadeMaterial },
            { x: 0.6,   y:-0.26, z: 0.08, s: 0.52, mat: cloudShadeMaterial },
            { x:-0.6,   y:-0.26, z: 0.05, s: 0.50, mat: cloudShadeMaterial },
          ];
          [...mainPuffs, ...shadePuffs].forEach((p) => {
            const puff = new THREE.Mesh(puffGeometry, p.mat);
            puff.position.set(p.x, p.y, p.z);
            puff.scale.setScalar(p.s);
            cluster.add(puff);
          });
          cluster.scale.setScalar(cfg.scale);
          cluster.position.set(cfg.x, cfg.y, cfg.z);
          daySkyGroup.add(cluster);
          cloudClusters.push({
            group: cluster,
            speed: cfg.speed,
            baseY: cfg.y,
            initialX: cfg.x,
          });
        });

        const modules = moduleNames.map(name => model.getObjectByName(name)).filter((object): object is ThreeTypes.Object3D => Boolean(object));
        const minuteHand = model.getObjectByName('MinuteHand');
        const hourHand = model.getObjectByName('HourHand');
        const reportBars = model.getObjectByName('Reports')?.children.slice(1).map((bar, index) => ({
          bar,
          index,
          scale: bar.scale.y,
          y: bar.position.y,
        })) || [];

        // Replace static beam/dot exports so they follow orbiting modules
        hub.children.slice(-14).forEach(child => { child.visible = false; });
        const beams = modules.map(() => {
          const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
            new THREE.LineBasicMaterial({ color: 0xf07a2b, transparent: true, opacity: 0.28 }),
          );
          const dot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffc247 }));
          hub.add(line, dot);
          return { line, dot };
        });

        const platform = hub.children[0] as ThreeTypes.Mesh;
        const platformMaterial = platform.material instanceof THREE.MeshStandardMaterial ? platform.material.clone() : null;
        if (platformMaterial) platform.material = platformMaterial;

        const applyTheme = () => {
          const dark = document.documentElement.dataset.theme === 'dark';
          ambient.groundColor.setHex(dark ? 0x1c2a4a : 0x9db4e6);
          ambient.intensity = dark ? 0.65 : 0.90;
          key.color.setHex(dark ? 0xaec2ff : 0xfff3e6);
          key.intensity = dark ? 1.0 : 1.3;
          accent.intensity = dark ? 1.4 : 0.65;
          accent.color.setHex(dark ? 0x6090ff : 0xf07a2b);
          fill.color.setHex(dark ? 0x2050a0 : 0x60b0ff);
          fill.intensity = dark ? 0.6 : 0.4;

          // Platform under the school building
          platformMaterial?.color.setHex(dark ? 0x283244 : 0x164673);

          // Planetary 3D model below the house:
          // Day mode -> 3D Earth
          // Dark mode -> 3D Moon
          domeMaterial.map = dark ? moonTexture : earthTexture;
          domeMaterial.roughness = dark ? 0.85 : 0.65;
          domeMaterial.metalness = dark ? 0.08 : 0.15;
          domeMaterial.needsUpdate = true;

          // Atmospheric rim glow:
          // Earth: Electric cyan-blue
          // Moon: Silvery ethereal lunar blue
          rimMaterial.color.setHex(dark ? 0x9bc2fc : 0x38bdf8);
          rimMaterial.opacity = dark ? 0.85 : 0.78;

          // Stars: Brilliant shining stars in dark mode, hidden in day mode
          starField.visible = dark;
          starMaterial.color.setHex(0xffffff);
          starMaterial.opacity = dark ? 0.95 : 0;

          // Clouds: Drift softly in day mode, hidden in dark mode
          daySkyGroup.visible = !dark;
          cloudMaterial.opacity = dark ? 0 : 0.96;
          cloudShadeMaterial.opacity = dark ? 0 : 0.88;
        };
        applyTheme();

        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const home = new THREE.Vector3(0, 2.0, 0);
        const target = home.clone();
        const desired = home.clone();
        let focus: ThreeTypes.Object3D | null = null;
        let yaw = -0.4;
        let yawBase = yaw;
        let yawTarget = yaw;
        let distance = 24;
        let distanceTarget = distance;
        let parallaxX = 0;
        let parallaxY = 0;
        let dragging = false;
        let moved = false;
        let previousX = 0;
        let frame = 0;
        let visible = true;
        let previousTime = performance.now();
        let elapsed = 0;
        let hoveredGroup: ThreeTypes.Object3D | null = null;

        const resize = () => {
          const width = host.clientWidth;
          const height = host.clientHeight;
          if (!width || !height) return;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          window.cancelAnimationFrame(frame);
          frame = 0;
          draw();
        };

        const draw = () => {
          frame = 0;
          if (!visible || document.hidden) return;
          const now = performance.now();
          const delta = Math.min((now - previousTime) / 1000, 0.05);
          previousTime = now;
          const isDark = document.documentElement.dataset.theme === 'dark';

          if (!media.matches) {
            elapsed += delta;
            if (!dragging && !focus) yawTarget = yawBase + Math.sin(elapsed * 0.18) * 0.12;

            // Twinkling stars sparkle dynamically in night mode
            if (isDark) {
              starMaterial.opacity = 0.86 + Math.sin(elapsed * 2.8) * 0.12;
            }

            // Drift clouds gently across daytime sky
            if (!isDark) {
              cloudClusters.forEach((c, idx) => {
                const span = 36;
                c.group.position.x = ((c.initialX + elapsed * c.speed + 18) % span) - 18;
                c.group.position.y = c.baseY + Math.sin(elapsed * 0.7 + idx) * 0.12;
              });
            }

            // Smooth rotation of the planet model below the house (Earth in Day, Moon in Dark)
            planetDome.rotation.y = elapsed * 0.09;

            // The house rotates smoothly on top of the planet (Earth/Moon)
            if (campus) {
              campus.rotation.y = elapsed * 0.12;
            }

            if (minuteHand) minuteHand.rotation.z = -elapsed * 1.2;
            if (hourHand) hourHand.rotation.z = -elapsed * 0.1;
            modules.forEach((group, index) => {
              const angle = elapsed * 0.25 + (index * Math.PI * 2) / modules.length;
              group.position.set(Math.sin(angle) * 4.9, 3.4 + Math.sin(elapsed * 1.4 + index) * 0.22, Math.cos(angle) * 4.9);
              group.rotation.y = angle;
            });
            reportBars.forEach(({ bar, index, scale, y }) => {
              bar.scale.y = scale * (0.85 + 0.15 * Math.sin(elapsed * 2 + index));
              bar.position.y = y + (bar.scale.y - scale) / 2;
            });
          }

          modules.forEach((group, index) => {
            const nextScale = group === hoveredGroup ? 1.3 : 1;
            group.scale.setScalar(media.matches ? nextScale : THREE.MathUtils.lerp(group.scale.x, nextScale, 0.14));
            const beam = beams[index];
            const positions = beam.line.geometry.attributes.position as ThreeTypes.BufferAttribute;
            positions.setXYZ(0, 0, 4.45, 0.1);
            positions.setXYZ(1, group.position.x, group.position.y, group.position.z);
            positions.needsUpdate = true;
            const fraction = media.matches ? 0.4 : (elapsed * 0.5 + index * 0.17) % 1;
            beam.dot.position.set(group.position.x * fraction, 4.45 + (group.position.y - 4.45) * fraction, 0.1 + (group.position.z - 0.1) * fraction);
          });

          if (focus) {
            focus.getWorldPosition(desired);
            desired.lerp(home, 0.85);
          } else desired.copy(home);

          const ease = media.matches ? 1 : 1 - Math.exp(-delta * 8);
          target.lerp(desired, ease);
          yaw = THREE.MathUtils.lerp(yaw, yawTarget, ease);
          distance = THREE.MathUtils.lerp(distance, distanceTarget, ease);
          const viewYaw = yaw + parallaxX;
          const viewElevation = 0.35 + parallaxY;
          camera.position.set(
            target.x + Math.sin(viewYaw) * Math.cos(viewElevation) * distance,
            target.y + Math.sin(viewElevation) * distance,
            target.z + Math.cos(viewYaw) * Math.cos(viewElevation) * distance
          );
          camera.lookAt(target);
          renderer.render(scene, camera);
          if (!media.matches) frame = window.requestAnimationFrame(draw);
        };

        const start = () => { if (!frame && visible && !document.hidden) frame = window.requestAnimationFrame(draw); };
        const pick = (event: PointerEvent) => {
          const bounds = renderer.domElement.getBoundingClientRect();
          pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
          raycaster.setFromCamera(pointer, camera);
          let object: ThreeTypes.Object3D | null = raycaster.intersectObjects(modules, true)[0]?.object || null;
          while (object && !modules.includes(object)) object = object.parent;
          return object;
        };

        const pointerDown = (event: PointerEvent) => {
          dragging = true;
          moved = false;
          previousX = event.clientX;
          renderer.domElement.setPointerCapture(event.pointerId);
        };

        const pointerMove = (event: PointerEvent) => {
          const bounds = renderer.domElement.getBoundingClientRect();
          parallaxX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.14;
          parallaxY = (0.5 - (event.clientY - bounds.top) / bounds.height) * 0.08;
          if (dragging) {
            const deltaX = event.clientX - previousX;
            if (Math.abs(deltaX) > 1) moved = true;
            yawBase += deltaX * 0.008;
            yawTarget = yawBase;
            previousX = event.clientX;
            hoveredGroup = null;
          } else {
            hoveredGroup = pick(event);
          }
          renderer.domElement.style.cursor = hoveredGroup ? 'pointer' : dragging ? 'grabbing' : 'grab';
          if (media.matches) draw();
        };

        const pointerUp = (event: PointerEvent) => {
          if (dragging && !moved) {
            const selected = pick(event);
            if (selected) { focus = selected; distanceTarget = 22; }
            else { focus = null; distanceTarget = 26; }
          }
          dragging = false;
          if (media.matches) draw();
        };

        const pointerLeave = () => {
          hoveredGroup = null;
          parallaxX = 0;
          parallaxY = 0;
          if (media.matches) draw();
        };

        const themeObserver = new MutationObserver(() => { applyTheme(); if (media.matches) draw(); });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        const visibilityChange = () => {
          if (document.hidden) { window.cancelAnimationFrame(frame); frame = 0; }
          else { previousTime = performance.now(); start(); }
        };
        const motionChange = () => { window.cancelAnimationFrame(frame); frame = 0; previousTime = performance.now(); start(); };
        const observer = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible) { previousTime = performance.now(); start(); }
          else { window.cancelAnimationFrame(frame); frame = 0; }
        });
        const resizeObserver = new ResizeObserver(resize);
        observer.observe(host);
        resizeObserver.observe(host);

        renderer.domElement.addEventListener('pointerdown', pointerDown);
        renderer.domElement.addEventListener('pointermove', pointerMove);
        renderer.domElement.addEventListener('pointerup', pointerUp);
        renderer.domElement.addEventListener('pointercancel', pointerUp);
        renderer.domElement.addEventListener('pointerleave', pointerLeave);
        document.addEventListener('visibilitychange', visibilityChange);
        media.addEventListener('change', motionChange);
        resize();
        start();
        setStatus('ready');

        disposeScene = () => {
          window.cancelAnimationFrame(frame);
          observer.disconnect();
          resizeObserver.disconnect();
          themeObserver.disconnect();
          document.removeEventListener('visibilitychange', visibilityChange);
          media.removeEventListener('change', motionChange);
          renderer.domElement.removeEventListener('pointerdown', pointerDown);
          renderer.domElement.removeEventListener('pointermove', pointerMove);
          renderer.domElement.removeEventListener('pointerup', pointerUp);
          renderer.domElement.removeEventListener('pointercancel', pointerUp);
          renderer.domElement.removeEventListener('pointerleave', pointerLeave);

          earthTexture.dispose();
          moonTexture.dispose();
          domeGeometry.dispose();
          domeMaterial.dispose();
          rimGeometry.dispose();
          rimMaterial.dispose();
          cloudMaterial.dispose();
          cloudShadeMaterial.dispose();
          puffGeometry.dispose();
          starGeometry.dispose();
          starMaterial.dispose();

          [model, camera].forEach(root => root.traverse((object) => {
            if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
              object.geometry.dispose();
              const materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach((material) => material.dispose());
            }
            if (object instanceof THREE.Points) {
              object.geometry.dispose();
              const materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach((material) => material.dispose());
            }
          }));
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch {
        disposeScene();
        if (!disposed) setStatus('unavailable');
      }
    }

    const idleId = window.requestIdleCallback ? window.requestIdleCallback(() => { void initialize(); }, { timeout: 1000 }) : 0;
    const timeoutId = idleId ? 0 : window.setTimeout(() => { void initialize(); }, 100);
    return () => {
      disposed = true;
      if (idleId) window.cancelIdleCallback(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
      disposeScene();
    };
  }, []);

  return (
    <div className="login-school-scene">
      {status === 'unavailable' && <p className="login-school-fallback">Welcome to your school workspace.</p>}
      <div ref={canvasHost} className="login-school-canvas" aria-hidden="true" />
    </div>
  );
}
