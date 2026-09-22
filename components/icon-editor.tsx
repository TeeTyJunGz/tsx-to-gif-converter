"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Plus, Save, Trash2 } from "lucide-react"

import {
  DEFAULT_CONFIG,
  EXPORT_SIZES,
  hasOriginalAnimation,
  type AnimationType,
  type IconConfig,
  type IconRecord,
  type LineCap,
  type LineJoin,
} from "@/lib/icon-types"
import { addIcon, deleteIcon, saveIconAs } from "@/app/actions/icons"

import { IconPreview } from "@/components/icon-preview"
import { GifDownloadButton } from "@/components/gif-download-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const SAMPLE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
  <path d="M12 2v20" />
  <path d="M2 12h20" />
</svg>`

interface IconEditorProps {
  initialIcons: IconRecord[]
}

export function IconEditor({ initialIcons }: IconEditorProps) {
  const [icons, setIcons] = useState<IconRecord[]>(initialIcons)
  const [selectedSlug, setSelectedSlug] = useState<string>(initialIcons[0]?.slug ?? "")
  const [config, setConfig] = useState<IconConfig>(initialIcons[0]?.config ?? DEFAULT_CONFIG)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const selected = useMemo(
    () => icons.find((i) => i.slug === selectedSlug) ?? icons[0],
    [icons, selectedSlug],
  )

  // Reset the working config whenever a different icon is chosen. Edits live in
  // local state only — persistence happens explicitly through "Save as".
  useEffect(() => {
    if (selected) setConfig({ ...DEFAULT_CONFIG, ...selected.config })
  }, [selected?.slug]) // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof IconConfig>(key: K, value: IconConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  if (!selected) {
    return (
      <EmptyState
        onAdd={(name, source) =>
          startTransition(async () => {
            try {
              setError(null)
              const next = await addIcon(name, source)
              setIcons(next)
              setSelectedSlug(next[next.length - 1]?.slug ?? next[0]?.slug ?? "")
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to add icon")
            }
          })
        }
        pending={pending}
        error={error}
      />
    )
  }

  const supportsOriginal = hasOriginalAnimation(selected.elements, selected.groupAnim)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* Left: stage */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-56 flex-1">
            <Label className="mb-1.5 block text-xs text-muted-foreground">Editing icon</Label>
            <Select value={selected.slug} onValueChange={setSelectedSlug}>
              <SelectTrigger aria-label="Select an icon to edit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {icons.map((icon) => (
                  <SelectItem key={icon.slug} value={icon.slug}>
                    {icon.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AddIconDialog
            pending={pending}
            error={error}
            onAdd={(name, source) =>
              startTransition(async () => {
                try {
                  setError(null)
                  const next = await addIcon(name, source)
                  setIcons(next)
                  const added = next.find((i) => !icons.some((p) => p.slug === i.slug))
                  setSelectedSlug(added?.slug ?? next[0]?.slug ?? "")
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to add icon")
                }
              })
            }
          />
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div
              className="flex min-h-80 items-center justify-center p-8"
              style={{
                backgroundImage:
                  "conic-gradient(from 90deg at 1px 1px, transparent 90deg, hsl(var(--muted)) 0)",
                backgroundSize: "16px 16px",
              }}
            >
              <IconPreview
                viewBox={selected.viewBox}
                elements={selected.elements}
                groupAnim={selected.groupAnim}
                config={config}
                label={selected.name}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <GifDownloadButton
            name={selected.name}
            slug={selected.slug}
            viewBox={selected.viewBox}
            elements={selected.elements}
            groupAnim={selected.groupAnim}
            config={config}
          />

          <SaveAsDialog
            defaultName={`${selected.name} copy`}
            pending={pending}
            onSave={(name) =>
              startTransition(async () => {
                setError(null)
                const next = await saveIconAs(name, selected.viewBox, selected.elements, config)
                setIcons(next)
                const created = next.find((i) => !icons.some((p) => p.slug === i.slug))
                if (created) setSelectedSlug(created.slug)
              })
            }
          />

          {icons.length > 1 && (
            <Button
              variant="ghost"
              className="gap-2 text-muted-foreground hover:text-destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const next = await deleteIcon(selected.slug)
                  setIcons(next)
                  setSelectedSlug(next[0]?.slug ?? "")
                })
              }
            >
              <Trash2 className="size-4" aria-hidden />
              Delete
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Right: controls */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ColorField
            label="Stroke color"
            value={config.color}
            onChange={(v) => set("color", v)}
          />
          <ColorField
            label="Background"
            value={config.background}
            onChange={(v) => set("background", v)}
            allowTransparent
          />

          <Separator />

          <SliderField
            label="Stroke width"
            value={config.strokeWidth}
            min={0.5}
            max={4}
            step={0.25}
            suffix="px"
            onChange={(v) => set("strokeWidth", v)}
          />
          <SliderField
            label="Preview size"
            value={config.size}
            min={24}
            max={256}
            step={4}
            suffix="px"
            onChange={(v) => set("size", v)}
          />

          <Separator />

          <div className="space-y-2">
            <Label>Animation</Label>
            <Select value={config.animation} onValueChange={(v) => set("animation", v as AnimationType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="original" disabled={!supportsOriginal}>
                  Original (as designed)
                </SelectItem>
                <SelectItem value="draw">Draw (line trace)</SelectItem>
                <SelectItem value="pulse">Pulse (fade)</SelectItem>
                <SelectItem value="none">None (static)</SelectItem>
              </SelectContent>
            </Select>
            {config.animation === "original" ? (
              <p className="text-xs text-muted-foreground">
                Replaying the icon&apos;s built-in motion, sped up or slowed down with the slider below.
              </p>
            ) : !supportsOriginal ? (
              <p className="text-xs text-muted-foreground">This icon has no built-in animation to restore.</p>
            ) : null}
          </div>

          <SliderField
          label="Animation speed"
          value={config.speed}
          min={0.25}
          max={3}
          step={0.05}
          suffix="x"
          disabled={config.animation === "none"}
          onChange={(v) => set("speed", v)}
          />

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Line cap</Label>
              <Select value={config.lineCap} onValueChange={(v) => set("lineCap", v as LineCap)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round">Round</SelectItem>
                  <SelectItem value="butt">Butt</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Line join</Label>
              <Select value={config.lineJoin} onValueChange={(v) => set("lineJoin", v as LineJoin)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round">Round</SelectItem>
                  <SelectItem value="bevel">Bevel</SelectItem>
                  <SelectItem value="miter">Miter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Export size (GIF)</Label>
            <Select
              value={String(config.exportSize)}
              onValueChange={(v) => set("exportSize", Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s} x {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setConfig({ ...DEFAULT_CONFIG, ...selected.config })}
          >
            Reset changes
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
  allowTransparent = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  allowTransparent?: boolean
}) {
  const transparent = value === "transparent"
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={transparent ? "#ffffff" : value}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-sm"
        />
        {allowTransparent && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(transparent ? "#ffffff" : "transparent")}
          >
            {transparent ? "Solid" : "Clear"}
          </Button>
        )}
      </div>
    </div>
  )
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  disabled = false,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix?: string
  disabled?: boolean
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className={disabled ? "text-muted-foreground" : undefined}>{label}</Label>
        <span className="text-sm tabular-nums text-muted-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  )
}

function AddIconDialog({
  onAdd,
  pending,
  error,
}: {
  onAdd: (name: string, source: string) => void
  pending: boolean
  error: string | null
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [source, setSource] = useState("")
  const [submitted, setSubmitted] = useState(false)

  // Close automatically once a successful add settles (no error, not pending).
  useEffect(() => {
    if (!pending && open && submitted && !error) {
      setOpen(false)
      setName("")
      setSource("")
      setSubmitted(false)
    }
  }, [pending]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" aria-hidden />
          Add icon
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a new icon</DialogTitle>
          <DialogDescription>
            Paste an icon component or raw SVG. The drawable shapes are extracted and saved as a new
            .tsx file in components/icons.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="icon-name">Name</Label>
            <Input
              id="icon-name"
              placeholder="e.g. Sound Wave"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="icon-source">Component / SVG code</Label>
            <Textarea
              id="icon-source"
              placeholder={SAMPLE}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="h-48 font-mono text-xs"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            disabled={pending || !source.trim()}
            onClick={() => {
              setSubmitted(true)
              onAdd(name, source)
            }}
          >
            {pending ? "Saving…" : "Add icon"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SaveAsDialog({
  defaultName,
  onSave,
  pending,
}: {
  defaultName: string
  onSave: (name: string) => void
  pending: boolean
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(defaultName)

  useEffect(() => {
    if (open) setName(defaultName)
  }, [open, defaultName])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2">
          <Save className="size-4" aria-hidden />
          Save as
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as a new icon</DialogTitle>
          <DialogDescription>
            Your current customizations are baked into a brand-new .tsx entry. The original icon is
            left untouched.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="save-as-name">New name</Label>
          <Input id="save-as-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button
            disabled={pending || !name.trim()}
            onClick={() => {
              onSave(name)
              setOpen(false)
            }}
          >
            {pending ? "Saving…" : "Save copy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EmptyState({
  onAdd,
  pending,
  error,
}: {
  onAdd: (name: string, source: string) => void
  pending: boolean
  error: string | null
}) {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>No icons yet</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Add your first icon by pasting a component or SVG markup.
        </p>
        <AddIconDialog onAdd={onAdd} pending={pending} error={error} />
      </CardContent>
    </Card>
  )
}
