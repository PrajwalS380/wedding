// Workbench close-up of the shared flora and materials (not exported): http://localhost:5199/?s=_flora&w=1200&h=800
import { THREE, rng, makeRenderer, makeComposer } from '../lib/common.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { marigolds, jasmineStrand, riceGeo, riceMaterial, powderMound, scatteredPetals } from '../lib/flora.js'
import { brassMaterial } from '../lib/materials.js'
export default async function ({ W, H }) {
  const q = new URLSearchParams(location.search)
  const r = rng(3)
  const renderer = makeRenderer(W, H, { shadows: true, exposure: 1 })
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x2a1a12)
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.01, 10); camera.position.set(0, 0.16, 0.26); camera.lookAt(0, 0.015, 0)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshStandardMaterial({ color: 0x6a1018, roughness: 0.7 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground)
  scene.add(marigolds([{ pos: new THREE.Vector3(-0.05, 0.02, 0), size: 0.045 }, { pos: new THREE.Vector3(0.05, 0.02, -0.02), size: 0.04, yellow: true }], { seed: 4 }))
  scene.add(jasmineStrand(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.12, 0.002, 0.06), new THREE.Vector3(-0.02, 0.002, 0.075), new THREE.Vector3(0.1, 0.002, 0.05)]), { seed: 2 }))
  const grains = new THREE.InstancedMesh(riceGeo(), riceMaterial(), 300); const m = new THREE.Matrix4(), c = new THREE.Color()
  for (let i = 0; i < 300; i++) { m.compose(new THREE.Vector3(0.01 + (r() - 0.5) * 0.06, 0.0012, 0.03 + (r() - 0.5) * 0.03), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * 6, r() * 0.3)), new THREE.Vector3(1, 1, 1)); grains.setMatrixAt(i, m); c.setHSL(0.11 + r() * 0.03, 0.8, 0.55); grains.setColorAt(i, c) }
  grains.castShadow = grains.receiveShadow = true; scene.add(grains)
  const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.016, 0], [0.024, 0.005], [0.029, 0.016], [0.03, 0.019], [0.027, 0.018], [0.022, 0.01], [0, 0.008]].map(([a, b]) => new THREE.Vector2(a, b)), 64), brassMaterial()); bowl.position.set(0.1, 0, 0.03); bowl.castShadow = bowl.receiveShadow = true; scene.add(bowl)
  const pm = powderMound({ radius: 0.022, height: 0.012 }); pm.position.set(0.1, 0.008, 0.03); scene.add(pm)
  scene.add(scatteredPetals([{ pos: new THREE.Vector3(-0.02, 0.002, 0.04), size: 0.015, color: '#a80f26' }, { pos: new THREE.Vector3(0.04, 0.002, 0.05), size: 0.014, color: '#ff8a00' }]))
  const key = new THREE.DirectionalLight(0xfff0dc, 2.4); key.position.set(-0.3, 0.5, 0.3); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 3; Object.assign(key.shadow.camera, { left: -0.2, right: 0.2, top: 0.2, bottom: -0.2, near: 0.05, far: 2 }); scene.add(key)
  scene.add(new THREE.HemisphereLight(0xfff0e0, 0x402010, 0.4))
  makeComposer(renderer, scene, camera, W, H, { bloom: null, ao: q.get('noao') ? null : { radius: 0.012, thickness: 0.006, intensity: 1 }, grade: { vignette: 0.2 } }).render()
}
