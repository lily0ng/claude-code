import type { Command } from '../../commands.ts'

const help = {
  type: 'local-jsx',
  name: 'help',
  description: 'Show help and available commands',
  load: () => import('./help.ts'),
} satisfies Command

export default help
