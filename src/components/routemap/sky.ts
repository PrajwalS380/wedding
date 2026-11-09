/**
 * Clouds over the city for the opening: scattered cumulus between the wide shot and the town, lit warm by the
 * low sun, that the camera sinks through as it dives towards the station. They thin away as it comes close
 * so it never sees the inside of one.
 */
import * as THREE from 'three'
import { rng } from './geo'
import { puffTexture } from './textures'

export function buildClouds(from: THREE.Vector3, to: THREE.Vector3) {
  const r = rng(17)
  const textures = [puffTexture(3), puffTexture(11), puffTexture(29)]
  const group = new THREE.Group()
  const puffs: { s: THREE.Sprite; base: number }[] = []
  const along = to.clone().sub(from)
  const side = new THREE.Vector3(-along.z, 0, along.x).normalize()
  for (let i = 0; i < 16; i++) {
    const t = 0.12 + r() * 0.6
    const p = from.clone().addScaledVector(along, t)
    p.y = 1150 + r() * 1250
    p.addScaledVector(side, (r() < 0.5 ? -1 : 1) * (350 + r() * 900)) // off to the sides, framing the view
    p.x += (r() - 0.5) * 500
    p.z += (r() - 0.5) * 500
    const m = new THREE.SpriteMaterial({ map: textures[i % 3], transparent: true, depthWrite: false, fog: false, opacity: 0, rotation: r() * 6.28, color: '#7d8bb0' })
    const s = new THREE.Sprite(m)
    s.position.copy(p)
    const size = 380 + r() * 520
    s.scale.set(size * 1.6, size, 1)
    s.renderOrder = 9
    group.add(s)
    puffs.push({ s, base: 0.22 + r() * 0.22 })
  }
  return {
    group,
    disposables: [...textures, ...puffs.map((p) => p.s.material)],
    /** fade each puff with its distance from the camera; `presence` 0…1 fades them all */
    update(camera: THREE.Vector3, presence: number) {
      group.visible = presence > 0.001
      for (const { s, base } of puffs) {
        const d = s.position.distanceTo(camera) - s.scale.y * 0.5
        ;(s.material as THREE.SpriteMaterial).opacity = base * presence * THREE.MathUtils.smoothstep(d, 40, 520)
      }
    },
  }
}
