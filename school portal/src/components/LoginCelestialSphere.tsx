import React, { useEffect, useRef, useState } from 'react';
import type * as ThreeTypes from 'three';

export interface LoginCelestialSphereProps {
  className?: string;
  size?: number | string;
  interactive?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

/**
 * LoginCelestialSphere
 * Compact, high-performance Three.js widget displaying an animated 3D celestial sphere:
 * - Light mode: Animated 3D Sun loaded from /models/sun.glb with emissive warmth and glowing corona.
 * - Dark mode: Animated 3D Moon loaded from /models/moon.glb with soft lunar glow.
 * - Smoothly switches between celestial bodies on data-theme change.
 */
export default function LoginCelestialSphere({
  className = '',
  size = 110,
  interactive = true,
  onClick,
  style,
}: LoginCelestialSphereProps) {
  const canvasHost = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.dataset.theme === 'dark';
    }
    return false;
  });

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

        // Set up high-performance WebGL renderer
        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: 'low-power',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.setClearColor(0x000000, 0);

        // Append canvas
        host.innerHTML = '';
        host.appendChild(renderer.domElement);
        disposeScene = () => {
          renderer.dispose();
          renderer.domElement.remove();
        };

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
        camera.position.set(0, 0, 3.5);
        scene.add(camera);

        // Lighting with dynamic day/night interpolation
        const dayAmbientColor = new THREE.Color(0xfff3e2);
        const nightAmbientColor = new THREE.Color(0x7692be);
        const ambient = new THREE.HemisphereLight(dayAmbientColor.clone(), 0x3d547d, 0.85);
        scene.add(ambient);

        const dayDirColor = new THREE.Color(0xffeedd);
        const nightDirColor = new THREE.Color(0xc5d9ff);
        const dirLight = new THREE.DirectionalLight(dayDirColor.clone(), 1.25);
        dirLight.position.set(2, 2.5, 3.5);
        scene.add(dirLight);

        const accentLight = new THREE.PointLight(0xffa545, 0.6, 12);
        accentLight.position.set(0, 0, 2);
        scene.add(accentLight);

        // Celestial Anchor group for responsive tilt/wobble
        const celestialAnchor = new THREE.Group();
        scene.add(celestialAnchor);

        const sunGroup = new THREE.Group();
        const moonGroup = new THREE.Group();
        celestialAnchor.add(sunGroup);
        celestialAnchor.add(moonGroup);

        // Load 3D Sun and Moon models asynchronously
        const [sunAsset, moonAsset] = await Promise.all([
          new GLTFLoader().loadAsync('/models/sun.glb'),
          new GLTFLoader().loadAsync('/models/moon.glb'),
        ]);

        if (disposed) {
          renderer.dispose();
          renderer.domElement.remove();
          return;
        }

        const sun = sunAsset.scene;
        const moon = moonAsset.scene;
        sunGroup.add(sun);
        moonGroup.add(moon);

        // Configure Sun: Emissive warmth & glowing corona
        const baseScale = 0.90;
        const sunCore = sun.getObjectByName('Sun') as ThreeTypes.Mesh | undefined;
        const sunMaterial = sunCore?.material instanceof THREE.MeshStandardMaterial ? sunCore.material : null;
        if (sunMaterial) {
          sunMaterial.emissive.setHex(0xffaa2e);
          sunMaterial.emissiveIntensity = 0.85;
          sunMaterial.roughness = 0.65;
        }

        // Glowing corona ring & radiant flare rays
        const corona = new THREE.Group();
        const coronaMaterial = new THREE.MeshBasicMaterial({
          color: 0xffcb62,
          transparent: true,
          opacity: 0.72,
          depthWrite: false,
          side: THREE.DoubleSide,
        });

        const coronaRing = new THREE.Mesh(new THREE.RingGeometry(1.08, 1.16, 64), coronaMaterial);
        corona.add(coronaRing);

        const outerGlowMaterial = new THREE.MeshBasicMaterial({
          color: 0xff9c22,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const outerGlowRing = new THREE.Mesh(new THREE.RingGeometry(1.16, 1.36, 64), outerGlowMaterial);
        corona.add(outerGlowRing);

        for (let i = 0; i < 12; i++) {
          const angle = (i * Math.PI) / 6;
          const ray = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.16, 4, 6), coronaMaterial);
          ray.position.set(Math.cos(angle) * 1.32, Math.sin(angle) * 1.32, 0);
          ray.rotation.z = angle - Math.PI / 2;
          corona.add(ray);
        }
        corona.position.z = -0.15;
        sunGroup.add(corona);

        // Configure Moon: Soft lunar texture & ethereal halo
        const moonCore = moon.getObjectByName('Moon') as ThreeTypes.Mesh | undefined;
        const moonMaterial = moonCore?.material instanceof THREE.MeshStandardMaterial ? moonCore.material : null;
        if (moonMaterial) {
          moonMaterial.roughness = 0.88;
          moonMaterial.metalness = 0.05;
        }

        const lunarHaloMaterial = new THREE.MeshBasicMaterial({
          color: 0xa4c6fc,
          transparent: true,
          opacity: 0.38,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const lunarHalo = new THREE.Mesh(new THREE.RingGeometry(1.06, 1.32, 64), lunarHaloMaterial);
        lunarHalo.position.z = -0.12;
        moonGroup.add(lunarHalo);

        const moonGlow = moon.getObjectByName('Glow0') as ThreeTypes.Mesh | undefined;
        const moonGlowMaterial = moonGlow?.material instanceof THREE.MeshStandardMaterial ? moonGlow.material : null;

        // Theme management: 0 = Sun (Light mode), 1 = Moon (Dark mode)
        let isDarkTheme = document.documentElement.dataset.theme === 'dark';
        let themeProgress = isDarkTheme ? 1.0 : 0.0;
        let targetProgress = themeProgress;

        const updateTheme = () => {
          const dark = document.documentElement.dataset.theme === 'dark';
          isDarkTheme = dark;
          targetProgress = dark ? 1.0 : 0.0;
          setIsDark(dark);
        };

        const media = window.matchMedia('(prefers-reduced-motion: reduce)');

        const renderFrame = () => {
          // Smooth transition scale curves
          const sunFactor = 1 - themeProgress;
          const moonFactor = themeProgress;

          const sunScale = baseScale * THREE.MathUtils.smoothstep(sunFactor, 0.001, 0.98);
          const moonScale = baseScale * THREE.MathUtils.smoothstep(moonFactor, 0.001, 0.98);

          sunGroup.scale.setScalar(Math.max(0.0001, sunScale));
          moonGroup.scale.setScalar(Math.max(0.0001, moonScale));

          sunGroup.visible = themeProgress < 0.999;
          moonGroup.visible = themeProgress > 0.001;

          // Seamless rotation spin during celestial transition
          sunGroup.rotation.z = themeProgress * -0.65;
          moonGroup.rotation.z = (1 - themeProgress) * 0.65;

          // Interpolate illumination & ambiance
          ambient.color.lerpColors(dayAmbientColor, nightAmbientColor, themeProgress);
          ambient.groundColor.setHex(themeProgress > 0.5 ? 0x18243b : 0x3d547d);
          ambient.intensity = THREE.MathUtils.lerp(0.85, 0.55, themeProgress);

          dirLight.color.lerpColors(dayDirColor, nightDirColor, themeProgress);
          dirLight.intensity = THREE.MathUtils.lerp(1.25, 1.4, themeProgress);
          dirLight.position.set(
            THREE.MathUtils.lerp(2, 3, themeProgress),
            THREE.MathUtils.lerp(2.5, 2, themeProgress),
            THREE.MathUtils.lerp(3.5, 3.2, themeProgress)
          );

          accentLight.color.setHex(themeProgress > 0.5 ? 0x82b4ff : 0xffa545);
          accentLight.intensity = THREE.MathUtils.lerp(0.5, 0.35, themeProgress);

          renderer.render(scene, camera);
        };

        let frame = 0;
        let visible = true;
        let previousTime = performance.now();
        let elapsed = 0;
        let tiltX = 0;
        let tiltY = 0;
        let targetTiltX = 0;
        let targetTiltY = 0;

        const draw = () => {
          frame = 0;
          if (!visible || document.hidden) return;

          const now = performance.now();
          const delta = Math.min((now - previousTime) / 1000, 0.05);
          previousTime = now;

          if (!media.matches) {
            elapsed += delta;

            // Smooth exponential damp for theme switching
            const blendRate = 1 - Math.exp(-delta * 7);
            themeProgress += (targetProgress - themeProgress) * blendRate;
            if (Math.abs(targetProgress - themeProgress) < 0.001) {
              themeProgress = targetProgress;
            }

            // Continuous celestial rotation
            sun.rotation.y = elapsed * 0.22;
            corona.rotation.z = elapsed * 0.12;

            moon.rotation.y = elapsed * 0.16;
            moon.rotation.x = Math.sin(elapsed * 0.15) * 0.06;

            // Emissive breathing warmth for Sun & Corona
            if (sunMaterial) {
              sunMaterial.emissiveIntensity = 0.85 + Math.sin(elapsed * 1.4) * 0.18;
            }
            coronaMaterial.opacity = 0.62 + Math.sin(elapsed * 1.4) * 0.14;
            outerGlowMaterial.opacity = 0.22 + Math.sin(elapsed * 1.4) * 0.08;

            // Soft lunar glow pulse
            if (moonGlowMaterial) {
              moonGlowMaterial.opacity = 0.025 + Math.sin(elapsed * 0.9) * 0.008;
            }
            lunarHaloMaterial.opacity = 0.32 + Math.sin(elapsed * 0.9) * 0.08;

            // Interactive mouse tilt interpolation
            const tiltEase = 1 - Math.exp(-delta * 9);
            tiltX += (targetTiltX - tiltX) * tiltEase;
            tiltY += (targetTiltY - tiltY) * tiltEase;
            celestialAnchor.rotation.x = tiltX;
            celestialAnchor.rotation.y = tiltY;
          } else {
            themeProgress = targetProgress;
            celestialAnchor.rotation.set(0, 0, 0);
          }

          renderFrame();

          // Keep animating if motion is allowed or during theme transition
          if (!media.matches || Math.abs(themeProgress - targetProgress) > 0.001) {
            frame = window.requestAnimationFrame(draw);
          }
        };

        const start = () => {
          if (!frame && visible && !document.hidden) {
            previousTime = performance.now();
            frame = window.requestAnimationFrame(draw);
          }
        };

        const resize = () => {
          const width = host.clientWidth;
          const height = host.clientHeight;
          if (!width || !height) return;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          if (media.matches) renderFrame();
        };

        // Pointer interactions: gentle reactive 3D tilt
        const onPointerMove = (e: PointerEvent) => {
          if (!interactive) return;
          const bounds = host.getBoundingClientRect();
          if (bounds.width === 0 || bounds.height === 0) return;
          const nx = (e.clientX - bounds.left) / bounds.width - 0.5;
          const ny = (e.clientY - bounds.top) / bounds.height - 0.5;
          targetTiltY = nx * 0.45;
          targetTiltX = -ny * 0.45;
          if (media.matches) {
            renderFrame();
          } else {
            start();
          }
        };

        const onPointerLeave = () => {
          targetTiltX = 0;
          targetTiltY = 0;
          if (media.matches) renderFrame();
        };

        // MutationObserver for theme transitions
        const themeObserver = new MutationObserver(() => {
          updateTheme();
          if (media.matches) {
            themeProgress = targetProgress;
            renderFrame();
          } else {
            start();
          }
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme'],
        });

        // Intersection, resize, visibility and motion observers
        const intersectionObserver = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible) start();
          else if (frame) {
            window.cancelAnimationFrame(frame);
            frame = 0;
          }
        });
        intersectionObserver.observe(host);

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);

        const onVisibilityChange = () => {
          if (document.hidden) {
            if (frame) {
              window.cancelAnimationFrame(frame);
              frame = 0;
            }
          } else {
            start();
          }
        };

        const onMotionChange = () => {
          if (frame) {
            window.cancelAnimationFrame(frame);
            frame = 0;
          }
          if (media.matches) {
            themeProgress = targetProgress;
            renderFrame();
          } else {
            start();
          }
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        media.addEventListener('change', onMotionChange);
        host.addEventListener('pointermove', onPointerMove);
        host.addEventListener('pointerleave', onPointerLeave);

        // Initial paint
        resize();
        renderFrame();
        start();
        setStatus('ready');

        // Cleanup callback
        disposeScene = () => {
          if (frame) window.cancelAnimationFrame(frame);
          intersectionObserver.disconnect();
          resizeObserver.disconnect();
          themeObserver.disconnect();
          document.removeEventListener('visibilitychange', onVisibilityChange);
          media.removeEventListener('change', onMotionChange);
          host.removeEventListener('pointermove', onPointerMove);
          host.removeEventListener('pointerleave', onPointerLeave);

          [sunGroup, moonGroup, corona].forEach((group) => {
            group.traverse((obj) => {
              if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
                materials.forEach((m) => m.dispose());
              }
            });
          });

          coronaRing.geometry.dispose();
          coronaMaterial.dispose();
          outerGlowRing.geometry.dispose();
          outerGlowMaterial.dispose();
          lunarHalo.geometry.dispose();
          lunarHaloMaterial.dispose();

          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch (error) {
        disposeScene();
        if (!disposed) setStatus('unavailable');
      }
    }

    const idleId =
      window.requestIdleCallback
        ? window.requestIdleCallback(() => { void initialize(); }, { timeout: 1000 })
        : 0;
    const timeoutId = idleId ? 0 : window.setTimeout(() => { void initialize(); }, 100);

    return () => {
      disposed = true;
      if (idleId) window.cancelIdleCallback(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
      disposeScene();
    };
  }, [interactive]);

  const formattedSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      className={`login-celestial-widget ${className}`.trim()}
      style={{
        width: formattedSize,
        height: formattedSize,
        minWidth: formattedSize,
        minHeight: formattedSize,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : interactive ? 'grab' : 'default',
        ...style,
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      aria-label={
        onClick
          ? `Toggle theme (currently ${isDark ? 'dark' : 'light'})`
          : `Celestial sphere (${isDark ? 'moon' : 'sun'})`
      }
    >
      <div
        ref={canvasHost}
        className="login-celestial-canvas"
        aria-hidden="true"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
      {status === 'unavailable' && (
        <div
          className="login-celestial-fallback"
          aria-hidden="true"
          style={{
            width: '80%',
            height: '80%',
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle, #7e9ac7 0%, #203350 70%)'
              : 'radial-gradient(circle, #ffce54 0%, #f77f00 70%)',
            boxShadow: isDark
              ? '0 0 15px rgba(130, 180, 255, 0.4)'
              : '0 0 18px rgba(255, 175, 40, 0.5)',
          }}
        />
      )}
    </div>
  );
}
