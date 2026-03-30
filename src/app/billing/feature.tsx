export function Feature({ text }: { text: string }) {
    return (
        <li className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <span className="text-teal-500 mt-0.5 shrink-0">✓</span>
            {text}
        </li>
    )
}
