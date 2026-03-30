import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import type { DayBucket } from "@/services"
import type { EventTypeKey } from "@/constants/analytics"

import { CHART_COLORS, CHART_TOOLTIP_STYLE } from "@/lib/chart-config"
import { formatAxisDate, formatDateShort } from "@/lib/format"

export function ActivityChart({ data, selected }: { data: DayBucket[]; selected: Set<EventTypeKey> }) {
    const show = (k: EventTypeKey) => selected.size === 0 || selected.has(k)
    return (
        <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barSize={6}>
                <XAxis dataKey="date" tickFormatter={formatAxisDate} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip labelFormatter={(v) => formatDateShort(v as string)} contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "rgba(161,161,170,0.08)" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                {show("follows")    && <Bar dataKey="follows"        name="Follows"     fill={CHART_COLORS.follows}    stackId="a" radius={[0,0,0,0]} />}
                {show("subs")       && <Bar dataKey="subs"           name="Subs"        fill={CHART_COLORS.subs}       stackId="a" radius={[0,0,0,0]} />}
                {show("bits")       && <Bar dataKey="bitsCount"      name="Cheers"      fill={CHART_COLORS.bits}       stackId="a" radius={[0,0,0,0]} />}
                {show("raids")      && <Bar dataKey="raidsCount"     name="Raids"       fill={CHART_COLORS.raids}      stackId="a" radius={[0,0,0,0]} />}
                {show("superchats") && <Bar dataKey="superchatsCount" name="Superchats" fill={CHART_COLORS.superchats} stackId="a" radius={[0,0,0,0]} />}
                {show("members")    && <Bar dataKey="members"        name="Members"     fill={CHART_COLORS.members}    stackId="a" radius={[2,2,0,0]} />}
            </BarChart>
        </ResponsiveContainer>
    )
}

export function RevenueChart({ data, selected }: { data: DayBucket[]; selected: Set<EventTypeKey> }) {
    const show = (k: EventTypeKey) => selected.size === 0 || selected.has(k)
    return (
        <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barSize={10} barCategoryGap="30%">
                <XAxis dataKey="date" tickFormatter={formatAxisDate} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip labelFormatter={(v) => formatDateShort(v as string)} contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "rgba(161,161,170,0.08)" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                {show("bits")       && <Bar dataKey="bitsTotal"       name="Bits"        fill={CHART_COLORS.bits}       radius={[3,3,0,0]} />}
                {show("raids")      && <Bar dataKey="raidViewers"     name="Raid viewers" fill={CHART_COLORS.raids}     radius={[3,3,0,0]} />}
                {show("superchats") && <Bar dataKey="superchatsTotal" name="Super Chats" fill={CHART_COLORS.superchats} radius={[3,3,0,0]} />}
            </BarChart>
        </ResponsiveContainer>
    )
}
