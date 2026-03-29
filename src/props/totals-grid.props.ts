import type {AnalyticsTotals} from "@/services";
import {EventTypeKey} from "@/constants/analytics";

export type TotalsGridProps = {
    totals: AnalyticsTotals
    hasYouTube: boolean
    selectedTypes: Set<EventTypeKey>
    onToggle: (key: EventTypeKey) => void
}
