export { FlashingChar } from './FlashingChar.ts'
export { GlimmerMessage } from './GlimmerMessage.ts'
export { ShimmerChar } from './ShimmerChar.ts'
export { SpinnerGlyph } from './SpinnerGlyph.ts'
export type { SpinnerMode } from './types.ts'
export { useShimmerAnimation } from './useShimmerAnimation.ts'
export { useStalledAnimation } from './useStalledAnimation.ts'
export { getDefaultCharacters, interpolateColor } from './utils.ts'
// Teammate components are NOT exported here - use dynamic require() to enable dead code elimination
// See REPL.tsx and Spinner.tsx for the correct import pattern
