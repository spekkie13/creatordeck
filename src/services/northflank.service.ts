import { env } from '@/lib/env'

class NorthflankService {
  private readonly headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.northflankWebhookSecret}`,
  }

  async registerChannel(channelId: string, accessToken: string, refreshToken: string): Promise<void> {
    const res = await fetch(`${env.northflankApiUrl}/channels`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ channelId, accessToken, refreshToken }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '(unreadable)')
      throw new Error(`[northflank] registerChannel failed (${res.status}): ${body}`)
    }
  }

  async deregisterChannel(channelId: string): Promise<void> {
    const res = await fetch(`${env.northflankApiUrl}/channels/${encodeURIComponent(channelId)}`, {
      method: 'DELETE',
      headers: this.headers,
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '(unreadable)')
      throw new Error(`[northflank] deregisterChannel failed (${res.status}): ${body}`)
    }
  }
}

export const northflankService = new NorthflankService()