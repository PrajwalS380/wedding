export type SceneQuality = 'low' | 'high'

export const QUALITY = {
  low: { fallingPetals: 26, floorPetals: 150, dust: 160, dpr: [1, 1.3] as [number, number], strandSpacing: 0.085 },
  high: { fallingPetals: 56, floorPetals: 320, dust: 360, dpr: [1, 1.8] as [number, number], strandSpacing: 0.07 },
} as const
