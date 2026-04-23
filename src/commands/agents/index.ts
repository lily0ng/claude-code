import type { Command } from '../../commands.ts'

const agents = {
  type: 'local-jsx',
  name: 'agents',
  description: 'Manage agent configurations',
  load: () => import('./agents.ts'),
} satisfies Command

export default agents
