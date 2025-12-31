import axios from 'axios';
import fetch from 'node-fetch';

export class KickAPI {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  updateAccessToken(accessToken) {
    this.accessToken = accessToken;
  }

  async getChannelInfo(channelName) {
    const response = await axios.get(`https://kick.com/api/v1/channels/${channelName}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    return response.data;
  }

  async banUser(channelId, username, userId, permanent = true) {
    const requestBody = {
      broadcaster_user_id: parseInt(channelId),
      user_id: parseInt(userId)
    };

    if (!permanent) {
      requestBody.duration = 600; // 10 минут
    }

    const response = await fetch('https://api.kick.com/public/v1/moderation/bans', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(responseData)}`);
    }

    return responseData;
  }
}
