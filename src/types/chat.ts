export type ChatMessage = {
    id: string
    platform: "twitch" | "youtube"
    userDisplayName: string
    message: string
    occurredAt: string
}
