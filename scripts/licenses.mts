// Liste les licences des paquets installés et échoue si une licence n'est pas dans la liste acceptée.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ALLOWED = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
  'CC0-1.0',
  'Unlicense',
  'BlueOak-1.0.0',
  'Python-2.0',
  'CC-BY-4.0',
  'WTFPL',
  'MPL-2.0'
])
// MPL-2.0 : copyleft faible au niveau du fichier ; utilisé uniquement en outil de build (lightningcss), non redistribué modifié.
const root = join(process.cwd(), 'node_modules')

function licenseOf(pkg: Record<string, unknown>): string {
  if (typeof pkg.license === 'string') return pkg.license
  if (pkg.license && typeof pkg.license.type === 'string') return pkg.license.type
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type).join(' OR ')
  return 'INCONNUE'
}

function* packageJsons(dir: string): Generator<{ name: string; file: string }> {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue
    const full = join(dir, name)
    if (!statSync(full).isDirectory()) continue
    if (name.startsWith('@')) {
      yield* packageJsons(full)
      continue
    }
    const file = join(full, 'package.json')
    if (existsSync(file)) yield { name, file }
    const nested = join(full, 'node_modules')
    if (existsSync(nested)) yield* packageJsons(nested)
  }
}

const found = new Map()
for (const { file } of packageJsons(root)) {
  const pkg = JSON.parse(readFileSync(file, 'utf8'))
  const key = `${pkg.name}@${pkg.version}`
  if (!found.has(key)) found.set(key, licenseOf(pkg))
}

const byLicense = new Map()
for (const [key, license] of found) {
  if (!byLicense.has(license)) byLicense.set(license, [])
  byLicense.get(license).push(key)
}

console.log(`${found.size} paquets installés`)
for (const [license, pkgs] of [...byLicense].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${String(pkgs.length).padStart(5)}  ${license}`)
}

const unknown = [...found].filter(([, license]) => !ALLOWED.has(license) && !/ OR /.test(license))
if (unknown.length > 0) {
  console.error('\nLicences non acceptées ou à vérifier :')
  for (const [key, license] of unknown) console.error(`  ${key} : ${license}`)
  process.exit(1)
}
console.log('\nToutes les licences sont dans la liste acceptée (ou en choix OR).')
