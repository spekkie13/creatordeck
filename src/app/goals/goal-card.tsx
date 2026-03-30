import {GoalCardProps} from "@/props/goal-card.props";
import {useState} from "react";
import {toDateInputValue} from "@/lib/format";

export function GoalCard({ label, logo, total, savedGoal, endsAt, accentColor, apiType, initialCount = 0 }: GoalCardProps) {
    const defaultGoal: number = savedGoal ?? 100
    const [currentGoal, setCurrentGoal] = useState(defaultGoal)
    const [goalInput, setGoalInput] = useState(String(defaultGoal))
    const [initialCountInput, setInitialCountInput] = useState(String(initialCount))
    const [endsAtInput, setEndsAtInput] = useState(toDateInputValue(endsAt))
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const effectiveInitialCount: number = apiType ? 0 : (parseInt(initialCountInput) || 0)
    const displayTotal: number = total + effectiveInitialCount
    const progress: number = Math.min((displayTotal / currentGoal) * 100, 100)

    async function save() {
        const val: number = parseInt(goalInput)
        if (isNaN(val) || val < 1) return
        setSaving(true)
        if (apiType) {
            await fetch("/api/goals", {
                method: "POST",
                body: JSON.stringify({ type: apiType, goal: val, endsAt: endsAtInput || null }),
                headers: { "Content-Type": "application/json" },
            })
        } else {
            const initialCountVal: number = Math.max(0, parseInt(initialCountInput) || 0)
            await fetch("/api/goal", {
                method: "POST",
                body: JSON.stringify({ goal: val, initialCount: initialCountVal, endsAt: endsAtInput || null }),
                headers: { "Content-Type": "application/json" },
            })
        }
        setCurrentGoal(val)
        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                {logo}
                <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</h2>
            </div>

            {/* Progress */}
            <div className="flex items-end gap-3">
                <span className="text-5xl font-bold">{displayTotal.toLocaleString()}</span>
                <span className="text-2xl text-zinc-400 dark:text-zinc-500 pb-1">/ {currentGoal.toLocaleString()}</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-3">
                <div className={`${accentColor} h-3 rounded-full transition-all duration-500`} style={{ width: `${progress}%` }} />
            </div>
            <p className="text-zinc-500 text-sm">{progress.toFixed(1)}% of goal reached</p>
            {endsAtInput && (
                <p className="text-xs text-zinc-400">
                    Ends {new Date(endsAtInput).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                </p>
            )}

            {/* Edit */}
            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-3">
                <div className={`grid gap-4 ${!apiType ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
                    {!apiType && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Initial amount</label>
                            <input
                                type="number"
                                value={initialCountInput}
                                onChange={e => setInitialCountInput(e.target.value)}
                                className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 text-zinc-900 dark:text-white"
                                min={0}
                            />
                            <p className="text-xs text-zinc-400">Subs before CreatorDeck</p>
                        </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Goal amount</label>
                        <input
                            type="number"
                            value={goalInput}
                            onChange={e => setGoalInput(e.target.value)}
                            className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 text-zinc-900 dark:text-white"
                            min={1}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            End date <span className="font-normal text-zinc-400 dark:text-zinc-600">(optional)</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={endsAtInput}
                                onChange={e => setEndsAtInput(e.target.value)}
                                className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 text-zinc-900 dark:text-white"
                            />
                            {endsAtInput && (
                                <button onClick={() => setEndsAtInput("")} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors shrink-0">
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={save}
                        disabled={saving}
                        className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                    >
                        {saving ? "Saving..." : "Save"}
                    </button>
                    {saved && <span className="text-xs text-green-500">Saved</span>}
                </div>
            </div>
        </div>
    )
}
