export function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0">{label}</span>
            <span className="text-xs text-zinc-900 dark:text-white text-right">{value}</span>
        </div>
    )
}
