import type { Command } from '../../commands.ts'

const addDir = {
  type: 'local-jsx',
  name: 'add-dir',
  description: 'Add a new working directory',
  argumentHint: '<path>',
  load: () => import('./add-dir.ts'),
} satisfies Command

export default addDir
