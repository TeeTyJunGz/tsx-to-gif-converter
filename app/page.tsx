import { listIcons } from "@/app/actions/icons"
import { IconEditor } from "@/components/icon-editor"

export default async function Page() {
  const icons = await listIcons()

  return (
    <main className="mx-auto min-h-svh w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="mb-8">
        <h1 className="text-balance text-3xl font-semibold tracking-tight">Animated Icon Studio</h1>
        <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
          Add icons by pasting component or SVG code, tweak color, stroke, animation and more, then
          export a looping GIF. Use {"\u201C"}Save as{"\u201D"} to keep a customized copy as a new
          .tsx file.
        </p>
      </header>

      <IconEditor initialIcons={icons} />
    </main>
  )
}
