"use server"

import { promises as fs } from "fs"
import path from "path"

import { DEFAULT_CONFIG, type IconConfig, type IconRecord } from "@/lib/icon-types"
import { parseIconSource } from "@/lib/parse-icon"
import { generateIconTsx } from "@/lib/generate-tsx"

const ICONS_DIR = path.join(process.cwd(), "components", "icons")

const SEED: IconRecord = {
  slug: "audio-lines",
  name: "Audio Lines",
  viewBox: "0 0 24 24",
  elements: [
    { type: "path", d: "M2 10v3" },
    { type: "path", d: "M6 6v11" },
    { type: "path", d: "M10 3v18" },
    { type: "path", d: "M14 8v7" },
    { type: "path", d: "M18 5v13" },
    { type: "path", d: "M22 10v3" },
  ],
  config: { ...DEFAULT_CONFIG },
}

async function ensureDir() {
  await fs.mkdir(ICONS_DIR, { recursive: true })
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "icon"
  )
}

async function existingSlugs(): Promise<Set<string>> {
  try {
    const files = await fs.readdir(ICONS_DIR)
    return new Set(files.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")))
  } catch {
    return new Set()
  }
}

async function uniqueSlug(base: string): Promise<string> {
  const taken = await existingSlugs()
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base}-${i}`)) i++
  return `${base}-${i}`
}

async function writeRecord(record: IconRecord): Promise<void> {
  await ensureDir()
  await fs.writeFile(path.join(ICONS_DIR, `${record.slug}.json`), JSON.stringify(record, null, 2), "utf8")
  await fs.writeFile(path.join(ICONS_DIR, `${record.slug}.tsx`), generateIconTsx(record), "utf8")
}

export async function listIcons(): Promise<IconRecord[]> {
  await ensureDir()
  let files: string[]
  try {
    files = await fs.readdir(ICONS_DIR)
  } catch {
    files = []
  }

  const jsonFiles = files.filter((f) => f.endsWith(".json"))

  // Seed the starter icon on first run so the editor is never empty.
  if (jsonFiles.length === 0) {
    await writeRecord(SEED)
    return [SEED]
  }

  const records: IconRecord[] = []
  for (const file of jsonFiles) {
    try {
      const raw = await fs.readFile(path.join(ICONS_DIR, file), "utf8")
      const parsed = JSON.parse(raw) as IconRecord
      if (parsed?.slug && Array.isArray(parsed.elements)) {
        records.push({ ...parsed, config: { ...DEFAULT_CONFIG, ...parsed.config } })
      }
    } catch {
      // Skip malformed files rather than failing the whole list.
    }
  }

  records.sort((a, b) => a.name.localeCompare(b.name))
  return records
}

export async function addIcon(name: string, source: string): Promise<IconRecord[]> {
  const trimmedName = name.trim() || "Untitled Icon"
  const parsed = parseIconSource(source)

  if (parsed.elements.length === 0) {
    throw new Error("No drawable SVG elements (path, line, circle, rect, polyline, polygon) were found in the pasted code.")
  }

  const slug = await uniqueSlug(slugify(trimmedName))
  const record: IconRecord = {
    slug,
    name: trimmedName,
    viewBox: parsed.viewBox,
    elements: parsed.elements,
    config: { ...DEFAULT_CONFIG },
  }
  await writeRecord(record)
  return listIcons()
}

export async function saveIconAs(
  name: string,
  viewBox: string,
  elements: IconRecord["elements"],
  config: IconConfig,
): Promise<IconRecord[]> {
  const trimmedName = name.trim() || "Untitled Copy"
  const slug = await uniqueSlug(slugify(trimmedName))
  const record: IconRecord = { slug, name: trimmedName, viewBox, elements, config }
  await writeRecord(record)
  return listIcons()
}

export async function deleteIcon(slug: string): Promise<IconRecord[]> {
  try {
    await fs.unlink(path.join(ICONS_DIR, `${slug}.json`))
  } catch {
    // ignore
  }
  try {
    await fs.unlink(path.join(ICONS_DIR, `${slug}.tsx`))
  } catch {
    // ignore
  }
  return listIcons()
}
