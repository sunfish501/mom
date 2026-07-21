# 엄마에게 보내는 스크롤 편지 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Subagent note:** when dispatching a subagent for a task in this plan, use Codex (via the `orca-cli` skill's worktree-spawn flow) as the subagent, per user preference — not a fresh Claude subagent.

**Goal:** Build a single-page, scroll-driven 3D letter site (envelope opens → salutation → sentences one at a time → signature) using Three.js + GSAP ScrollTrigger, with no build step, and deploy it to GitHub Pages at https://github.com/sunfish501/mom.

**Architecture:** Plain HTML/CSS/JS loaded via `<script>` tags (Three.js r128 UMD build + GSAP/ScrollTrigger from CDN). A single scroll-progress value (0–1) computed by GSAP ScrollTrigger drives both the Three.js scene (`js/scene.js`) and the DOM text layer (`js/app.js`) through a shared pure mapping function (`js/scrollMap.js`), so the 3D animation and the text are always in sync. All 3D geometry (envelope, flowers, hearts) is generated procedurally — no external model files.

**Tech Stack:** Three.js 0.128 (CDN, global `THREE`), GSAP 3.12 + ScrollTrigger (CDN), vanilla JS (UMD-style modules, `require`-able from Node for tests, `window`-attached for the browser), Node's built-in `node:test` runner for the pure-logic unit tests, GitHub Pages for hosting.

## Global Constraints

- No build step / no bundler — every JS file must work as a plain `<script src="...">` include, and also be `require`-able from Node for tests (UMD-lite pattern).
- Three.js, GSAP, and ScrollTrigger are loaded from CDN only.
- All 3D objects (envelope, flowers, hearts) are generated in code via Three.js geometries — no imported `.glb`/`.gltf` models.
- Mobile-first performance: `renderer.setPixelRatio` capped at 2, low decor object count (10), low-poly geometry.
- WebGL-unsupported browsers must see a static fallback message, not a broken canvas.
- Fixed 5-scene structure (envelope closed → envelope opens → salutation → body sentences, one per scroll step → signature), driven by a single scroll-progress value shared between the 3D scene and the text layer.
- Deploy target: GitHub Pages on the `sunfish501/mom` repo, served from the root of `master`. Push/commit in this repo may happen without asking first (user has granted standing permission for this repo only).

---

### Task 1: Project scaffold + WebGL fallback detection

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `js/webglDetect.js`
- Test: `test/webglDetect.test.js`

**Interfaces:**
- Produces: `WebGLDetect.isWebGLAvailable(canvas)` — pure function, takes any object with a `getContext` method (or `null`), returns `boolean`. Attached to `window.WebGLDetect` in the browser, `module.exports` in Node.

- [ ] **Step 1: Write the failing test**

Create `test/webglDetect.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { isWebGLAvailable } = require('../js/webglDetect.js');

test('returns false when canvas is null', () => {
  assert.strictEqual(isWebGLAvailable(null), false);
});

test('returns false when getContext returns null', () => {
  const fakeCanvas = { getContext: () => null };
  assert.strictEqual(isWebGLAvailable(fakeCanvas), false);
});

test('returns true when getContext returns a context object', () => {
  const fakeCanvas = { getContext: () => ({}) };
  assert.strictEqual(isWebGLAvailable(fakeCanvas), true);
});

test('returns false when getContext throws', () => {
  const fakeCanvas = { getContext: () => { throw new Error('no webgl'); } };
  assert.strictEqual(isWebGLAvailable(fakeCanvas), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/webglDetect.test.js`
Expected: FAIL — `Cannot find module '../js/webglDetect.js'`

- [ ] **Step 3: Write minimal implementation**

Create `js/webglDetect.js`:

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WebGLDetect = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function isWebGLAvailable(canvas) {
    if (!canvas || typeof canvas.getContext !== 'function') return false;
    try {
      const ctx = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!ctx;
    } catch (e) {
      return false;
    }
  }
  return { isWebGLAvailable };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/webglDetect.test.js`
Expected: PASS — 4 tests, 0 failures

- [ ] **Step 5: Create the HTML shell and stylesheet**

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>엄마에게</title>
<link rel="stylesheet" href="style.css" />
</head>
<body>
<div id="scroll-spacer"></div>
<canvas id="scene-canvas"></canvas>
<div id="text-layer"></div>
<div id="fallback" style="display:none;">
  <p>이 브라우저는 3D 효과를 지원하지 않아요. 최신 브라우저로 다시 열어주세요.</p>
</div>

<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
<script src="js/webglDetect.js"></script>
<script src="js/scrollMap.js"></script>
<script src="js/content.js"></script>
<script src="js/objects.js"></script>
<script src="js/scene.js"></script>
<script src="js/app.js"></script>
</body>
</html>
```

Create `style.css`:

```css
html, body {
  margin: 0;
  padding: 0;
  background: #1a1420;
  overflow-x: hidden;
}

#scroll-spacer {
  height: 600vh;
}

#scene-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: block;
}

#text-layer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  text-align: center;
  padding: 0 1.5rem;
  box-sizing: border-box;
}

#text-layer p {
  font-family: Georgia, 'Nanum Myeongjo', serif;
  font-size: clamp(1.2rem, 4vw, 2rem);
  color: #fff5f0;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
}

#fallback {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1420;
  color: #fff5f0;
  text-align: center;
  padding: 2rem;
}
```

Note: `index.html` references `js/scrollMap.js`, `js/content.js`, `js/objects.js`, `js/scene.js`, `js/app.js` which don't exist yet — that's expected, they're built in Tasks 2–5. Opening `index.html` in a browser right now will show a blank page with console 404s for those files; that's fine at this checkpoint.

- [ ] **Step 6: Commit**

```bash
git add index.html style.css js/webglDetect.js test/webglDetect.test.js
git commit -m "feat: add page scaffold and WebGL availability detection"
```

---

### Task 2: Scroll-to-scene mapping logic + letter content data

**Files:**
- Create: `js/scrollMap.js`
- Create: `js/content.js`
- Test: `test/scrollMap.test.js`

**Interfaces:**
- Consumes: none (pure logic + static data)
- Produces:
  - `ScrollMap.getSceneState(progress, sentenceCount)` → `{ scene: 1|2|3|4|5, local: number (0–1), sentenceIndex: number|null }`. `scene` is which of the 5 scenes the given `progress` (0–1) falls in; `local` is the 0–1 progress *within* that scene; `sentenceIndex` is only non-null when `scene === 4`, giving which sentence (0-based) to show.
  - `LetterContent` → `{ salutation: string, sentences: string[], signature: string }`.

- [ ] **Step 1: Write the failing tests**

Create `test/scrollMap.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { getSceneState } = require('../js/scrollMap.js');

test('progress 0 is scene 1 at local 0', () => {
  const state = getSceneState(0, 6);
  assert.strictEqual(state.scene, 1);
  assert.strictEqual(state.local, 0);
});

test('progress 1 is scene 5 at local 1', () => {
  const state = getSceneState(1, 6);
  assert.strictEqual(state.scene, 5);
  assert.strictEqual(state.local, 1);
});

test('progress inside scene 4 range maps to the correct sentence index', () => {
  // scene 4 spans 0.32-0.85; midpoint local 0.5 with 6 sentences -> index 3
  const mid = 0.32 + (0.85 - 0.32) * 0.5;
  const state = getSceneState(mid, 6);
  assert.strictEqual(state.scene, 4);
  assert.strictEqual(state.sentenceIndex, 3);
});

test('sentenceIndex is null outside scene 4', () => {
  const state = getSceneState(0.05, 6);
  assert.strictEqual(state.sentenceIndex, null);
});

test('out-of-range progress values are clamped', () => {
  const under = getSceneState(-0.5, 6);
  const over = getSceneState(1.5, 6);
  assert.strictEqual(under.scene, 1);
  assert.strictEqual(under.local, 0);
  assert.strictEqual(over.scene, 5);
  assert.strictEqual(over.local, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/scrollMap.test.js`
Expected: FAIL — `Cannot find module '../js/scrollMap.js'`

- [ ] **Step 3: Write minimal implementation**

Create `js/scrollMap.js`:

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ScrollMap = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const SCENE_BOUNDS = [
    { scene: 1, start: 0.00, end: 0.08 },
    { scene: 2, start: 0.08, end: 0.22 },
    { scene: 3, start: 0.22, end: 0.32 },
    { scene: 4, start: 0.32, end: 0.85 },
    { scene: 5, start: 0.85, end: 1.00 },
  ];

  function clamp01(n) {
    return Math.min(1, Math.max(0, n));
  }

  function getSceneState(progress, sentenceCount) {
    const p = clamp01(progress);
    const bound = SCENE_BOUNDS.find((b) => p >= b.start && p <= b.end) || SCENE_BOUNDS[SCENE_BOUNDS.length - 1];
    const span = bound.end - bound.start;
    const local = span === 0 ? 0 : clamp01((p - bound.start) / span);

    let sentenceIndex = null;
    if (bound.scene === 4 && sentenceCount > 0) {
      sentenceIndex = Math.min(sentenceCount - 1, Math.floor(local * sentenceCount));
    }

    return { scene: bound.scene, local, sentenceIndex };
  }

  return { getSceneState, SCENE_BOUNDS };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/scrollMap.test.js`
Expected: PASS — 5 tests, 0 failures

- [ ] **Step 5: Add the letter content data**

Create `js/content.js` (placeholder Korean text — the user will swap in the final letter later):

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LetterContent = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  return {
    salutation: '엄마에게',
    sentences: [
      '오늘따라 엄마 생각이 유독 많이 났어요.',
      '어렸을 때부터 지금까지, 늘 제 편이 되어주셔서 감사해요.',
      '힘들다고 투정 부릴 때도 묵묵히 들어주셨죠.',
      '엄마 덕분에 지금의 제가 있다는 걸 잊지 않고 있어요.',
      '앞으로는 제가 더 자주 안부 묻고, 더 많이 표현할게요.',
      '항상 건강하시고, 오래오래 제 곁에 있어주세요.',
    ],
    signature: '엄마를 사랑하는 딸/아들 올림',
  };
});
```

- [ ] **Step 6: Commit**

```bash
git add js/scrollMap.js js/content.js test/scrollMap.test.js
git commit -m "feat: add scroll-to-scene mapping and letter content data"
```

---

### Task 3: Procedural 3D objects (envelope, flower, heart)

**Files:**
- Create: `js/objects.js`
- Test: `test/objects-preview.html` (manual visual check — Three.js geometry rendering can't be meaningfully unit-tested without a WebGL context, so verification here is "open in browser, confirm the three shapes look right")

**Interfaces:**
- Consumes: global `THREE` (loaded via CDN in the browser)
- Produces:
  - `LetterObjects.createEnvelope(THREE)` → `{ group: THREE.Group, flapPivot: THREE.Group, paper: THREE.Mesh, body: THREE.Mesh }`
  - `LetterObjects.createFlower(THREE, color?)` → `THREE.Group`
  - `LetterObjects.createHeart(THREE, color?)` → `THREE.Mesh`

- [ ] **Step 1: Write the object factories**

Create `js/objects.js`:

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LetterObjects = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function createEnvelope(THREE) {
    const group = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(2.2, 1.4, 0.05);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf5e6d3, roughness: 0.8 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    const flapShape = new THREE.Shape();
    flapShape.moveTo(-1.1, 0);
    flapShape.lineTo(1.1, 0);
    flapShape.lineTo(0, -0.9);
    flapShape.lineTo(-1.1, 0);
    const flapGeo = new THREE.ShapeGeometry(flapShape);
    const flapMat = new THREE.MeshStandardMaterial({ color: 0xead9c3, roughness: 0.8, side: THREE.DoubleSide });
    const flapPivot = new THREE.Group();
    flapPivot.position.set(0, 0.7, 0.03);
    const flap = new THREE.Mesh(flapGeo, flapMat);
    flapPivot.add(flap);
    group.add(flapPivot);

    const paperGeo = new THREE.PlaneGeometry(1.8, 1.1);
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
    const paper = new THREE.Mesh(paperGeo, paperMat);
    paper.position.set(0, 0, -0.02);
    group.add(paper);

    return { group, flapPivot, paper, body };
  }

  function createFlower(THREE, color) {
    const group = new THREE.Group();
    const petalGeo = new THREE.SphereGeometry(0.18, 8, 6);
    const petalMat = new THREE.MeshStandardMaterial({ color: color || 0xf4a6c1, roughness: 0.6 });
    const petalCount = 6;
    for (let i = 0; i < petalCount; i++) {
      const petal = new THREE.Mesh(petalGeo, petalMat);
      const angle = (i / petalCount) * Math.PI * 2;
      petal.position.set(Math.cos(angle) * 0.22, Math.sin(angle) * 0.22, 0);
      petal.scale.set(1, 0.6, 0.6);
      group.add(petal);
    }
    const centerGeo = new THREE.SphereGeometry(0.12, 8, 6);
    const centerMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.5 });
    group.add(new THREE.Mesh(centerGeo, centerMat));
    return group;
  }

  function createHeart(THREE, color) {
    const shape = new THREE.Shape();
    const x = 0, y = 0;
    shape.moveTo(x, y);
    shape.bezierCurveTo(x, y - 0.3, x - 0.6, y - 0.3, x - 0.6, y + 0.05);
    shape.bezierCurveTo(x - 0.6, y + 0.35, x - 0.3, y + 0.55, x, y + 0.75);
    shape.bezierCurveTo(x + 0.3, y + 0.55, x + 0.6, y + 0.35, x + 0.6, y + 0.05);
    shape.bezierCurveTo(x + 0.6, y - 0.3, x, y - 0.3, x, y);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.15,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
    });
    geo.center();
    const mat = new THREE.MeshStandardMaterial({ color: color || 0xe63950, roughness: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(0.5, 0.5, 0.5);
    return mesh;
  }

  return { createEnvelope, createFlower, createHeart };
});
```

- [ ] **Step 2: Build a visual preview harness**

Create `test/objects-preview.html`:

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Objects Preview</title>
<style>html, body { margin: 0; height: 100%; background: #1a1420; }</style>
</head>
<body>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
<script src="../js/objects.js"></script>
<script>
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(2, 3, 4);
  scene.add(dir);

  const envelope = LetterObjects.createEnvelope(THREE);
  envelope.group.position.x = -3;
  scene.add(envelope.group);

  const flower = LetterObjects.createFlower(THREE);
  flower.position.x = 0;
  scene.add(flower);

  const heart = LetterObjects.createHeart(THREE);
  heart.position.x = 3;
  scene.add(heart);

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
</script>
</body>
</html>
```

- [ ] **Step 3: Manually verify**

Open `test/objects-preview.html` directly in a browser (double-click the file, or `start test/objects-preview.html` on Windows).
Expected: three shapes visible left-to-right — an envelope (box + triangular flap + white paper peeking out), a 6-petal flower, and a heart. Drag to orbit and confirm each shape reads clearly as what it's meant to be. Fix any obviously broken geometry (inverted normals, wrong scale) before moving on.

- [ ] **Step 4: Commit**

```bash
git add js/objects.js test/objects-preview.html
git commit -m "feat: add procedural envelope, flower, and heart 3D objects"
```

---

### Task 4: Scene setup + scroll-state-driven update loop

**Files:**
- Create: `js/scene.js`
- Test: `test/scene-preview.html` (manual scrubber — lets you check every scene transition without wiring real scroll yet)

**Interfaces:**
- Consumes:
  - `LetterObjects.createEnvelope(THREE)`, `LetterObjects.createFlower(THREE)`, `LetterObjects.createHeart(THREE)` (Task 3)
- Produces:
  - `LetterScene.createLetterScene(THREE, canvas)` → `{ update(state, elapsedTime), resize(), renderer, scene, camera }`, where `state` is the `{ scene, local, sentenceIndex }` object shape produced by `ScrollMap.getSceneState` (Task 2), and `elapsedTime` is seconds (e.g. from `THREE.Clock`).

- [ ] **Step 1: Write the scene module**

Create `js/scene.js`:

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LetterScene = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function createLetterScene(THREE, canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 5);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(2, 3, 4);
    scene.add(dirLight);

    const envelope = window.LetterObjects.createEnvelope(THREE);
    scene.add(envelope.group);

    const DECOR_COUNT = 10;
    const decorGroup = new THREE.Group();
    decorGroup.visible = false;
    for (let i = 0; i < DECOR_COUNT; i++) {
      const isFlower = i % 2 === 0;
      const obj = isFlower ? window.LetterObjects.createFlower(THREE) : window.LetterObjects.createHeart(THREE);
      const angle = (i / DECOR_COUNT) * Math.PI * 2;
      const radius = 2.2 + (i % 3) * 0.3;
      obj.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.6, -1 - (i % 3) * 0.5);
      obj.userData.baseAngle = angle;
      obj.userData.radius = radius;
      decorGroup.add(obj);
    }
    scene.add(decorGroup);

    function resize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', resize);

    function setOpacity(object3d, opacity) {
      object3d.traverse((child) => {
        if (child.material) {
          child.material.transparent = true;
          child.material.opacity = opacity;
        }
      });
    }

    function update(state, elapsedTime) {
      const { scene: sceneIndex, local } = state;

      const floatY = Math.sin(elapsedTime * 0.8) * 0.05;
      envelope.group.position.y = floatY;
      envelope.group.rotation.y = Math.sin(elapsedTime * 0.3) * 0.15;

      const openT = sceneIndex < 2 ? 0 : sceneIndex === 2 ? local : 1;
      envelope.flapPivot.rotation.x = -Math.PI * 0.85 * openT;
      envelope.paper.position.y = openT * 1.1;

      const envelopeOpacity = sceneIndex <= 2 ? 1 : sceneIndex === 3 ? 1 - local : 0;
      setOpacity(envelope.group, envelopeOpacity);
      envelope.group.visible = envelopeOpacity > 0.01;

      const decorVisible = sceneIndex >= 3;
      decorGroup.visible = decorVisible;
      if (decorVisible) {
        const decorOpacity = sceneIndex === 3 ? local : sceneIndex === 5 ? 1 - local : 1;
        const convergeT = sceneIndex === 5 ? local : 0;
        decorGroup.children.forEach((obj, i) => {
          obj.rotation.y = elapsedTime * 0.4 + i;
          const radius = obj.userData.radius * (1 - convergeT * 0.8);
          obj.position.x = Math.cos(obj.userData.baseAngle + elapsedTime * 0.1) * radius;
          obj.position.y = Math.sin(obj.userData.baseAngle + elapsedTime * 0.1) * radius * 0.6;
          setOpacity(obj, decorOpacity);
        });
      }

      renderer.render(scene, camera);
    }

    return { update, resize, renderer, scene, camera };
  }

  return { createLetterScene };
});
```

- [ ] **Step 2: Build a manual scene scrubber**

Create `test/scene-preview.html`:

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Scene Preview</title>
<style>
  html, body { margin: 0; height: 100%; background: #1a1420; overflow: hidden; }
  canvas { display: block; }
  #controls { position: fixed; bottom: 10px; left: 10px; color: #fff; font-family: sans-serif; z-index: 10; }
  #controls input { width: 300px; }
</style>
</head>
<body>
<canvas id="scene-canvas"></canvas>
<div id="controls">
  <label>progress: <span id="progress-val">0.00</span></label><br />
  <input id="progress" type="range" min="0" max="1" step="0.001" value="0" />
</div>

<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>
<script src="../js/scrollMap.js"></script>
<script src="../js/objects.js"></script>
<script src="../js/scene.js"></script>
<script>
  const canvas = document.getElementById('scene-canvas');
  const letterScene = LetterScene.createLetterScene(THREE, canvas);
  const clock = new THREE.Clock();
  const slider = document.getElementById('progress');
  const label = document.getElementById('progress-val');

  function animate() {
    requestAnimationFrame(animate);
    const progress = parseFloat(slider.value);
    label.textContent = progress.toFixed(2);
    const state = ScrollMap.getSceneState(progress, 6);
    letterScene.update(state, clock.getElapsedTime());
  }
  animate();
</script>
</body>
</html>
```

- [ ] **Step 3: Manually verify**

Open `test/scene-preview.html` in a browser and drag the slider from 0 to 1.
Expected:
- 0.00–0.08: closed envelope floats/rotates gently, nothing else visible
- 0.08–0.22: flap hinges open, paper slides upward out of the envelope
- 0.22–0.32: envelope fades out while flowers/hearts fade in around it
- 0.32–0.85: flowers/hearts orbit continuously, envelope gone
- 0.85–1.00: flowers/hearts drift inward and shrink toward center

If any transition looks abrupt or objects clip through each other, adjust the constants in `update()` (e.g. `SCENE_BOUNDS` in `scrollMap.js` or the opacity/radius formulas above) before moving on.

- [ ] **Step 4: Commit**

```bash
git add js/scene.js test/scene-preview.html
git commit -m "feat: add Three.js scene with scroll-state-driven update loop"
```

---

### Task 5: Real scroll wiring + text layer

**Files:**
- Modify: `js/app.js` (create — referenced by `index.html` since Task 1 but not yet implemented)

**Interfaces:**
- Consumes:
  - `WebGLDetect.isWebGLAvailable(canvas)` (Task 1)
  - `ScrollMap.getSceneState(progress, sentenceCount)` (Task 2)
  - `LetterContent` (Task 2)
  - `LetterScene.createLetterScene(THREE, canvas)` (Task 4)
  - Global `gsap`, `ScrollTrigger`, `THREE` (CDN)
- Produces: nothing consumed by later tasks — this is the final bootstrap script.

- [ ] **Step 1: Write app.js**

Create `js/app.js`:

```js
(function () {
  const canvas = document.getElementById('scene-canvas');
  const fallback = document.getElementById('fallback');
  const textLayer = document.getElementById('text-layer');

  const probeCanvas = document.createElement('canvas');
  if (!window.WebGLDetect.isWebGLAvailable(probeCanvas)) {
    canvas.style.display = 'none';
    fallback.style.display = 'flex';
    return;
  }

  const THREE = window.THREE;
  const letterScene = window.LetterScene.createLetterScene(THREE, canvas);
  const content = window.LetterContent;
  const clock = new THREE.Clock();

  let currentState = { scene: 1, local: 0, sentenceIndex: null };

  function renderText(state) {
    let html = '';
    if (state.scene === 3) {
      html = `<p class="salutation" style="opacity:${state.local}">${content.salutation}</p>`;
    } else if (state.scene === 4 && state.sentenceIndex !== null) {
      html = `<p class="sentence">${content.sentences[state.sentenceIndex]}</p>`;
    } else if (state.scene === 5) {
      html = `<p class="signature" style="opacity:${state.local}">${content.signature}</p>`;
    } else if (state.scene > 3) {
      html = `<p class="salutation">${content.salutation}</p>`;
    }
    textLayer.innerHTML = html;
  }

  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      currentState = window.ScrollMap.getSceneState(self.progress, content.sentences.length);
      renderText(currentState);
    },
  });

  function animate() {
    requestAnimationFrame(animate);
    letterScene.update(currentState, clock.getElapsedTime());
  }
  animate();
})();
```

- [ ] **Step 2: Manually verify full scroll behavior**

Open `index.html` in a browser (e.g. `start index.html` on Windows) and scroll from top to bottom.
Expected:
- No console errors, no 404s
- Envelope idle → opens → fades as flowers/hearts appear, matching the `scene-preview.html` behavior from Task 4
- "엄마에게" fades in once the envelope is gone
- Each of the 6 placeholder sentences appears and disappears in its own scroll segment, in order, with no two sentences visible at once
- Signature fades in at the very end of the scroll and stays visible while flowers/hearts converge/shrink
- Text stays readable against every background the 3D scene produces during the scroll (the `text-shadow` in `style.css` should keep white text legible over both the dark background and any lighter decor objects passing behind it) — scroll slowly and check every scene, not just a quick skim

- [ ] **Step 3: Manually verify the WebGL-unavailable fallback**

Temporarily force the fallback path: in `js/app.js`, change the line `if (!window.WebGLDetect.isWebGLAvailable(probeCanvas)) {` to `if (true) {`, save, and reload `index.html`.
Expected: the canvas stays hidden, and the `#fallback` message ("이 브라우저는 3D 효과를 지원하지 않아요...") is shown centered on a dark background instead.
Revert the temporary change back to `if (!window.WebGLDetect.isWebGLAvailable(probeCanvas)) {` before continuing — this was a manual check only, not a permanent code change.

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: wire GSAP ScrollTrigger to drive the 3D scene and text layer"
```

---

### Task 6: Mobile performance pass

**Files:**
- Modify: `js/scene.js` (adjust `DECOR_COUNT` and geometry segment counts based on device)

**Interfaces:**
- Consumes: none new
- Produces: none new — this task only tunes constants inside `createLetterScene`

- [ ] **Step 1: Scale decor count and geometry detail down for low-end devices**

In `js/scene.js`, replace the fixed `DECOR_COUNT` constant and the flower/heart segment counts with a device-aware value. Modify the top of `createLetterScene`:

```js
    const isLowEndDevice = (navigator.hardwareConcurrency || 4) <= 4 || window.innerWidth < 480;
    const DECOR_COUNT = isLowEndDevice ? 6 : 10;
```

(Replace the existing `const DECOR_COUNT = 10;` line with the two lines above.)

- [ ] **Step 2: Manually verify on a simulated low-end mobile device**

Open `index.html` in Chrome, open DevTools → toggle device toolbar (Ctrl+Shift+M) → select a mid-range phone preset (e.g. "Moto G Power") → throttle CPU to 4x slowdown (Performance panel → CPU dropdown) → reload and scroll through the full page.
Expected: scroll stays responsive (no multi-second jank per scroll tick), `DECOR_COUNT` reads as 6 in this emulated profile (check via `console.log` or DevTools breakpoint if unsure), and all 5 scenes still play correctly.

- [ ] **Step 3: Commit**

```bash
git add js/scene.js
git commit -m "perf: reduce decor object count on low-end/mobile devices"
```

---

### Task 7: Deploy to GitHub Pages

**Files:** none (repo configuration only)

**Interfaces:** none

- [ ] **Step 1: Push all committed work**

```bash
git push origin master
```

Expected: push succeeds, `master` on `origin` (https://github.com/sunfish501/mom) matches local `master`.

- [ ] **Step 2: Enable GitHub Pages from the root of `master`**

```bash
gh api repos/sunfish501/mom/pages -X POST -f "source[branch]=master" -f "source[path]=/"
```

Expected: JSON response with a `"status"` field (e.g. `"building"`) and a `"html_url"` field like `https://sunfish501.github.io/mom/`. If Pages was already enabled, this command may instead return a 409 — in that case run `gh api repos/sunfish501/mom/pages` (GET, no `-X POST`) to confirm the current source is `master` / `/`.

- [ ] **Step 3: Wait for the build and verify the live URL**

```bash
gh api repos/sunfish501/mom/pages/builds/latest
```

Expected: `"status": "built"` (poll every ~15s if it still says `"building"`). Then open `https://sunfish501.github.io/mom/` in a browser and confirm the full scroll experience works there exactly as it did locally in Task 5's verification step.

- [ ] **Step 4: Share the link**

No commit needed for this step — hand the `https://sunfish501.github.io/mom/` URL to the user to send to their mom.
