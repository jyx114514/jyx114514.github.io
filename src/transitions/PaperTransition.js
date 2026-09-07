import * as THREE from 'three';
import { paperTexture } from './paperTexture.js';

const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const COVER = .44;
const DURATION = 1320;

export class PaperTransition {
  constructor() {
    this.running = false;
    this.frame = 0;
    this.motion = matchMedia('(prefers-reduced-motion: reduce)');
    this.resize = () => {
      if (!this.renderer) return;
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.5 : 2));
      this.renderer.setSize(innerWidth, innerHeight);
      if (this.running) this.draw(this.progress);
    };
    this.visibility = () => { if (document.hidden && this.running) this.finish(); };
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this.visibility);
  }

  init() {
    if (this.renderer) return;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer = renderer;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'paper-transition-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.hidden = true;
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.finish();
      this.release();
    });
    document.body.append(renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, .1, 100);
    this.camera.position.z = 10;
    this.textures = [paperTexture(), paperTexture(true)];
    this.geometry = new THREE.PlaneGeometry(1, 1, 8, 12);
    let seed = 9271;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    this.pages = [];
    const small = innerWidth < 700;
    const counts = small ? [5, 5, 4] : [8, 9, 5];
    counts.forEach((count, layer) => {
      for (let i = 0; i < count; i++) {
        const cover = layer === 2 && i < 3;
        const material = new THREE.MeshBasicMaterial({
          map: this.textures[i % 4 === 0 ? 1 : 0],
          side: THREE.DoubleSide,
          transparent: layer === 0,
          opacity: layer === 0 ? .85 : 1,
          depthWrite: layer !== 0,
          color: layer === 0 ? 0xbad7ef : (i % 2 ? 0xffffff : 0xe6f1ff)
        });
        const uniforms = { paperTime: { value: 0 }, phase: { value: random() * 6.28 }, bend: { value: cover ? .006 : .024 + random() * .012 } };
        material.onBeforeCompile = shader => {
          Object.assign(shader.uniforms, uniforms);
          shader.vertexShader = 'uniform float paperTime; uniform float phase; uniform float bend;\n' + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
            #include <begin_vertex>
            transformed.z += sin(position.x * 5.0 + paperTime * 8.0 + phase) * bend;
            transformed.z += sin(position.y * 4.0 + paperTime * 5.0 + phase) * bend * .2;
          `);
        };
        const mesh = new THREE.Mesh(this.geometry, material);
        mesh.renderOrder = layer;
        this.scene.add(mesh);
        this.pages.push({ mesh, uniforms, layer, cover, index: i,
          z: cover ? 5 + i * .18 : -4 + layer * 3.8 + random(),
          y: (random() - .5) * 1.25, size: .12 + layer * .10 + random() * .12,
          delay: random() * .19, travel: .62 + random() * .18,
          tilt: (random() - .5) * .8, spin: (random() - .5) * 2,
          slope: (random() - .5) * .25 });
      }
    });
    this.resize();
    renderer.compile(this.scene, this.camera);
  }

  draw(progress) {
    this.progress = progress;
    for (const page of this.pages) {
      const { mesh, cover, index, uniforms } = page;
      const flight = clamp((progress - page.delay) / page.travel);
      const z = page.z + (cover ? 0 : Math.sin(flight * Math.PI) * .65);
      const height = 2 * Math.tan(THREE.MathUtils.degToRad(22.5)) * (10 - z);
      const width = height * this.camera.aspect;
      uniforms.paperTime.value = progress * 1.32;
      if (cover) {
        // Three overlapping opaque sheets, each ~64% viewport width.
        // At .43–.48 their union overscans all four edges at every aspect ratio.
        const sweep = progress < .43
          ? -1.85 * (1 - smooth((progress - .23) / .20))
          : progress <= .48 ? (progress - .43) * 1.6
          : .08 + 1.85 * smooth((progress - .48) / .40);
        mesh.position.set((sweep + (index - 1) * .36) * width, 0, z);
        mesh.scale.set(width * .64, height * 1.55, 1);
        const flutter = progress < .43 ? 1 - smooth((progress - .23) / .20)
          : smooth((progress - .48) / .40);
        mesh.rotation.set(.009 * (index - 1) + flutter * .16,
          .009 * (index - 1) + flutter * (index - 1) * .24,
          .008 * (index - 1) + flutter * (index - 1.3) * .15);
        mesh.visible = progress >= .23 && progress <= .88;
      } else {
        mesh.position.set((-1.15 + flight * 2.5) * width,
          (page.y + page.slope * flight + Math.sin(flight * 5 + uniforms.phase.value) * .035) * height, z);
        const size = height * page.size;
        mesh.scale.set(size * .72, size, 1);
        mesh.rotation.set(.15 + Math.sin(flight * 4 + index) * .18, page.tilt + flight * page.spin, page.tilt + flight * page.spin * .4);
        mesh.visible = progress >= page.delay && flight < 1;
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  play({ onCovered, onComplete = () => {} }) {
    if (this.running) return false;
    this.running = true;
    this.covered = false;
    this.callbacks = { onCovered, onComplete };
    if (this.motion.matches) { this.finish(); return true; }
    try { this.init(); } catch (error) {
      console.warn('Paper transition unavailable; switching directly.', error);
      this.finish(); this.release(); return true;
    }
    this.renderer.domElement.hidden = false;
    this.progress = 0;
    let previous = performance.now();
    const tick = now => {
      if (!this.running) return;
      let next = Math.min(1, this.progress + Math.min(now - previous, 50) / DURATION);
      previous = now;
      // Always submit a fully covered frame before changing the underlying DOM,
      // even if a dropped frame crosses the scheduled coverage instant.
      if (!this.covered && this.progress >= COVER) {
        this.covered = true;
        try { this.callbacks.onCovered(); } catch (error) { this.finish(); throw error; }
      } else if (!this.covered && next >= COVER) next = COVER;
      this.draw(next);
      if (next >= 1) this.finish();
      else this.frame = requestAnimationFrame(tick);
    };
    this.draw(0);
    this.frame = requestAnimationFrame(tick);
    return true;
  }

  finish() {
    if (!this.running) return;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    try {
      if (!this.covered) { this.covered = true; this.callbacks.onCovered(); }
    } finally {
      this.running = false;
      if (this.renderer) this.renderer.domElement.hidden = true;
      this.callbacks.onComplete();
      this.callbacks = null;
    }
  }

  release() {
    this.pages?.forEach(page => page.mesh.material.dispose());
    this.geometry?.dispose();
    this.textures?.forEach(texture => texture.dispose());
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.renderer = null;
  }

  dispose() {
    this.finish(); this.release();
    window.removeEventListener('resize', this.resize);
    document.removeEventListener('visibilitychange', this.visibility);
  }
}
