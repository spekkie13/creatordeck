import { LINK_ERRORS } from '@/constants/errors'
import { env } from '@/lib/env'
import {
  AccountConflictException,
  NoYouTubeChannelException,
  SpotifyProfileFetchFailedException,
  StreamElementsTokenExchangeFailedException,
  TokenExchangeFailedException,
} from '@/lib/exceptions'

import { linkedAccountsRepository } from '@/repositories'

export function fromSearchError(error: string): string {
  switch (error) {
    case 'account_conflict':
      return LINK_ERRORS.ACCOUNT_CONFLICT
    case 'no_youtube_channel':
      return LINK_ERRORS.NO_YOUTUBE_CHANNEL
    default:
      return 'Something went wrong. Please try again.'
  }
}

class ConnectionsService {
  async linkGoogleAccount(
    userId: string,
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ): Promise<{ channelId: string; displayName: string }> {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new TokenExchangeFailedException('Google token exchange failed')

    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    )
    const channelData = await channelRes.json()
    const channel = channelData.items?.[0]
    if (!channel) throw new NoYouTubeChannelException('No YouTube channel found for this Google account')

    const channelId: string = channel.id
    const displayName: string = channel.snippet?.title ?? channelId

    try {
      await linkedAccountsRepository.upsertForUser(userId, {
        provider: 'youtube',
        providerAccountId: channelId,
        login: channelId,
        displayName,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? '',
      })
    } catch {
      throw new AccountConflictException(`YouTube channel ${channelId} is already linked to another account`)
    }

    return { channelId, displayName }
  }

  async linkSpotifyAccount(
    userId: string,
    code: string,
    redirectUri: string,
  ): Promise<{ profileId: string; displayName: string }> {
    const credentials = Buffer.from(`${env.spotifyClientId}:${env.spotifyClientSecret}`).toString('base64')
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new TokenExchangeFailedException('Spotify token exchange failed')

    const profileRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await profileRes.json()
    if (!profile.id) throw new SpotifyProfileFetchFailedException('Failed to fetch Spotify profile')

    try {
      await linkedAccountsRepository.upsertForUser(userId, {
        provider: 'spotify',
        providerAccountId: profile.id,
        login: profile.id,
        displayName: profile.display_name ?? profile.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? '',
      })
    } catch {
      throw new AccountConflictException(`Spotify account ${profile.id} is already linked to another account`)
    }

    return { profileId: profile.id, displayName: profile.display_name ?? profile.id }
  }

  async linkStreamElementsAccount(
    userId: string,
    jwtToken: string,
  ): Promise<{ channelId: string }> {
    const profileRes = await fetch('https://api.streamelements.com/kappa/v2/channels/me', {
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
    const profile = await profileRes.json()
    if (!profile._id) throw new StreamElementsTokenExchangeFailedException('Failed to fetch StreamElements channel')

    const channelId: string = profile._id
    const displayName: string = profile.displayName ?? profile.username ?? channelId

    try {
      await linkedAccountsRepository.upsertForUser(userId, {
        provider: 'streamelements',
        providerAccountId: channelId,
        login: profile.username ?? channelId,
        displayName,
        accessToken: jwtToken,
        refreshToken: '',
      })
    } catch {
      throw new AccountConflictException(`StreamElements account ${channelId} is already linked to another account`)
    }

    return { channelId }
  }

  async unlinkStreamElementsAccount(userId: string): Promise<string | null> {
    const account = await linkedAccountsRepository.findByUserIdAndProvider(userId, 'streamelements')
    if (!account) return null
    await linkedAccountsRepository.deleteByUserIdAndProvider(userId, 'streamelements')
    return account.providerAccountId
  }
}

export const connectionsService = new ConnectionsService()
