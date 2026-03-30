import type { ConnectionRowProps } from "@/props/connection-row.props"

export function ConnectionRow({ name, description, connected, logo, detail, comingSoon, connectButton, disconnectButton, children }: ConnectionRowProps) {
    return (
        <div>
            <div className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
                <div className="flex items-start gap-4">
                    <div className="shrink-0 mt-0.5">{logo}</div>
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-900 dark:text-white">{name}</span>
                            {comingSoon && (
                                <span className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">Coming soon</span>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500">{description}</p>
                        {detail && <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{detail}</p>}
                    </div>
                </div>
                <div className="shrink-0 flex items-center gap-2 pl-9 sm:pl-0">
                    {connected ? (
                        <>
                            {!detail && (
                                <span className="flex items-center gap-1.5 text-xs text-green-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Connected
                </span>
                            )}
                            {disconnectButton}
                        </>
                    ) : connectButton ?? (
                        <button
                            disabled={comingSoon}
                            className="text-xs bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Connect
                        </button>
                    )}
                </div>
            </div>
            {children}
        </div>
    )
}
