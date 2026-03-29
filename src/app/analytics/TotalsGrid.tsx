import { EventTypeKey } from "@/constants/analytics";
import { CHART_COLORS } from "@/lib/chart-config";
import { formatSuperchatTotal } from "@/lib/format";
import { TotalsGridProps } from "@/props/totals-grid.props";
import { StatCard } from "@/app/analytics/StatCard";

export function TotalsGrid({ totals, hasYouTube, selectedTypes, onToggle }: TotalsGridProps) {
    const anySelected = selectedTypes.size > 0
    const isActive = (k: EventTypeKey) => selectedTypes.has(k)
    const isDimmed = (k: EventTypeKey) => anySelected && !selectedTypes.has(k)

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
                label="Followers"
                primary={totals.follows.toLocaleString()}
                color={CHART_COLORS.follows}
                active={isActive("follows")} dimmed={isDimmed("follows")}
                onClick={() => onToggle("follows")}
            />
            <StatCard
                label="Subscribers"
                primary={totals.subs.toLocaleString()}
                color={CHART_COLORS.subs}
                active={isActive("subs")} dimmed={isDimmed("subs")}
                onClick={() => onToggle("subs")}
            />
            <StatCard
                label="Bits"
                primary={totals.bits.total.toLocaleString()}
                secondary={`${totals.bits.count} cheers`}
                color={CHART_COLORS.bits}
                active={isActive("bits")} dimmed={isDimmed("bits")}
                onClick={() => onToggle("bits")}
            />
            <StatCard
                label="Raid viewers"
                primary={totals.raids.total.toLocaleString()}
                secondary={`${totals.raids.count} raids`}
                color={CHART_COLORS.raids}
                active={isActive("raids")} dimmed={isDimmed("raids")}
                onClick={() => onToggle("raids")}
            />
            {hasYouTube && (
                <>
                    <StatCard
                        label="Super Chats"
                        primary={formatSuperchatTotal(totals.superchats.byCurrency)}
                        secondary={`${totals.superchats.count} superchats`}
                        color={CHART_COLORS.superchats}
                        active={isActive("superchats")} dimmed={isDimmed("superchats")}
                        onClick={() => onToggle("superchats")}
                    />
                    <StatCard
                        label="Members"
                        primary={totals.members.toLocaleString()}
                        color={CHART_COLORS.members}
                        active={isActive("members")} dimmed={isDimmed("members")}
                        onClick={() => onToggle("members")}
                    />
                </>
            )}
        </div>
    )
}
