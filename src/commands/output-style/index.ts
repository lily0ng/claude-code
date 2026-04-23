import type { Command } from '../../commands.ts'

const outputStyle = {
  type: 'local-jsx',
  name: 'output-style',
  description: 'Deprecated: use /config to change output style',
  isHidden: true,
  load: () => import('./output-style.ts'),
} satisfies Command

export default outputStyle
