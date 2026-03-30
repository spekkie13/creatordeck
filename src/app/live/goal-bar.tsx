export function GoalBar({ label, current, goal }: { label: string; current: number; goal: number }) {
    const pct: number = Math.min(100, Math.round((current / goal) * 100))
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>{label}</span>
                <span>{current} / {goal}</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
        </div>
    )
}
