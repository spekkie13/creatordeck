import {FeatureRowProps} from "@/props/feature-row.props";

export function FeatureRow({ name, description, enabled = false, comingSoon }: FeatureRowProps) {
    return (
        <div className="px-6 py-5 flex items-center justify-between gap-6">
            <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">{name}</span>
                    {comingSoon && (
                        <span className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">Coming soon</span>
                    )}
                </div>
                <p className="text-xs text-zinc-500">{description}</p>
            </div>
            <div
                title={comingSoon ? "Coming soon" : enabled ? "Active" : "Inactive"}
                className={`relative shrink-0 w-10 h-6 rounded-full cursor-default ${
                    comingSoon
                        ? "bg-zinc-200 dark:bg-zinc-700 opacity-40"
                        : enabled
                            ? "bg-purple-500"
                            : "bg-zinc-200 dark:bg-zinc-700"
                }`}
            >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${enabled && !comingSoon ? "left-5" : "left-1"}`} />
            </div>
        </div>
    )
}
