export type GoalCardProps = {
    label: string
    logo: React.ReactNode
    total: number
    savedGoal: number | null  // null = not set yet
    endsAt: string | null
    accentColor: string       // tailwind colour for progress bar, e.g. "bg-purple-500"
    apiType?: string          // undefined = uses /api/goal (Twitch subs), otherwise /api/goals
    initialCount?: number     // only for Twitch subs
}
