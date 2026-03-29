export function StatCard({ label, primary, secondary, color, active, dimmed, onClick }: {
    label: string
    primary: string
    secondary?: string
    color: string
    active?: boolean
    dimmed?: boolean
    onClick?: () => void
}) {
    return (
        <div
            onClick={onClick}
            className={`bg-white dark:bg-zinc-900 border rounded-xl px-5 py-4 flex flex-col justify-between gap-3 transition-all duration-150 ${
                onClick ? "cursor-pointer select-none" : ""
            } ${
                active
                    ? "border-zinc-400 dark:border-zinc-500 ring-1 ring-zinc-300 dark:ring-zinc-600"
                    : dimmed
                        ? "border-zinc-200 dark:border-zinc-800 opacity-40"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            }`}
        >
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
