export function StatCard({ label, primary, secondary, color, isActive }: {
    label: string
    primary: string
    secondary?: string
    isActive?: boolean
    color: string
}) {
    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-4 flex flex-col justify-between gap-3">
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
            </div>
            <div>
                <p className="text-2xl font-bold leading-none">{primary}</p>
                {secondary && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{secondary}</p>}
            </div>
        </div>
    )
}
