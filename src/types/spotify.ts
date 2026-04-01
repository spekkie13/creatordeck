export type NowPlaying = {
    isPlaying: boolean
    track: string
    artist: string
    albumArt: string | null
    progress: number
    duration: number
} | null

export type QueueTrack = {
    track: string
    artist: string
    albumArt: string | null
}

export type SpotifyAccount = {
    providerAccountId: string
    accessToken: string
    refreshToken: string | null
}
