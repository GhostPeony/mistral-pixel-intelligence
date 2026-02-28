import { mkdirSync, existsSync } from 'fs'
import { join } from 'path'

export class Workspace {
  readonly dataDir: string

  constructor(baseDir: string = process.cwd()) {
    this.dataDir = join(baseDir, '.mistral-maker')
  }

  init(): void {
    const dirs = ['', 'datasets', 'datasets/amplified', 'models']
    for (const dir of dirs) {
      const path = join(this.dataDir, dir)
      if (!existsSync(path)) mkdirSync(path, { recursive: true })
    }
  }
}
