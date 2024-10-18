import { join } from 'node:path'

const packageJsonPath = join(import.meta.dir, '../package.json')
const packageJson = await Bun.file(packageJsonPath).json()

// NOTE: We explicitly don't want to publish the type field.
// We create a separate package.json for `build/cjs` and `build/esm` that has the type field.
packageJson.type = undefined

Bun.write(packageJsonPath, JSON.stringify(packageJson, null, 2))
