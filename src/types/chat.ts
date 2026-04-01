export type ChatMessage = {
    id: string
    platform: "youtube" | "twitch"
    userDisplayName: string
    message: string
    occurredAt: string
}
