export type StatusVariant = "good" | "warning"
export type StatusInfo = {
    label: string;
    subtext: string;
    pill: string;
    dot: string;
}

export type PlatformStatusInfo = {
    dot: string;
    text: string;
    label: string;
}

export const STATUS_CONFIG: Record<StatusVariant, StatusInfo> = {
    good: {
        label: "All good",
        subtext: "Everything is set up and ready to go. Have a great stream!",
        pill: "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400",
        dot: "bg-green-500",
    },
    warning: {
        label: "Action required",
        subtext: "There are a few things to set up before you're ready to go.",
        pill: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
        dot: "bg-amber-500",
    },
}
