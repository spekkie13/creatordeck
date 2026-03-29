import { EVENT_COLORS } from "@/constants/colors";
import { formatSuperchatTotal } from "@/lib/format";
import { AnalyticsTotals } from "@/services";
import { StatCard } from "@/app/analytics/[sessionId]/StatCard";

export function TotalsRow({ totals }: { totals: AnalyticsTotals }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard
                label="Followers"
                primary={totals.follows.toLocaleString()}
                color={EVENT_COLORS.follow}
            />
            <StatCard
                label="Subscribers"
                primary={totals.subs.toLocaleString()}
                color={EVENT_COLORS.sub}
            />
            <StatCard
                label="Bits"
                primary={totals.bits.total.toLocaleString()}
                secondary={`${totals.bits.count} cheers`}
                color={EVENT_COLORS.bits}
            />
            <StatCard
                label="Raid viewers"
                primary={totals.raids.total.toLocaleString()}
                secondary={`${totals.raids.count} raids`}
                color={EVENT_COLORS.raid}
            />
            {totals.superchats.count > 0 && (
                <StatCard
                    label="Super Chats"
                    primary={formatSuperchatTotal(totals.superchats.byCurrency)}
                    secondary={`${totals.superchats.count} superchats`}
                    color={EVENT_COLORS.superchat}
                />
            )}
            {totals.members > 0 && (
                <StatCard label="Members" primary={totals.members.toLocaleString()} color={EVENT_COLORS.member} />
            )}
        </div>
    )
}
