import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { OAuthServer } from './auth.js';
import { KickAPI } from './kickApi.js';
import { ChatClient } from './chatClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class KickAutoBanner {
  constructor() {
    this.config = null;
    this.authServer = null;
    this.api = null;
    this.chatClient = null;
    this.channelInfo = null;
    this.bannedUsers = new Set(); // Чтобы не банить одного пользователя дважды
  }

  async loadConfig() {
    const configPath = path.join(__dirname, '..', 'config.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    this.config = JSON.parse(configData);
  }

  async authenticate() {
    this.authServer = new OAuthServer(this.config);
    const accessToken = await this.authServer.start();
    return accessToken;
  }

  checkUsername(username) {
    const lowerUsername = username.toLowerCase();
    for (const word of this.config.words) {
      if (lowerUsername.includes(word.toLowerCase())) {
        return { shouldBan: true, keyword: word };
      }
    }
    return { shouldBan: false };
  }

  async banUser(username, userId, keyword) {
    if (this.bannedUsers.has(username)) {
      return;
    }

    try {
      await this.api.banUser(this.channelInfo.id, username, userId, true);
      this.bannedUsers.add(username);
      console.log(`[BAN] ${username} | Keyword: "${keyword}"`);
    } catch (error) {
      console.error(`[ERROR] Failed to ban ${username}:`, error.message);
    }
  }

  setupChatHandlers() {
    this.chatClient.on('message', async (data) => {
      try {
        const username = data.sender?.username || data.sender?.slug;
        const userId = data.sender?.id;

        const check = this.checkUsername(username);
        if (check.shouldBan) {
          await this.banUser(username, userId, check.keyword);
        }
      } catch (error) {
        console.error('[ERROR]', error);
      }
    });
  }

  async start() {
    try {
      console.log('='.repeat(60));
      console.log('Kick.com Auto-Banner Bot');
      console.log('='.repeat(60));

      await this.loadConfig();

      console.log(`Channel: ${this.config.channel}`);
      console.log(`Ban keywords: ${this.config.words.join(', ')}`);
      console.log('');

      const accessToken = await this.authenticate();
      this.api = new KickAPI(accessToken);

      let channelId = this.config.channelId;
      let chatroomId = this.config.chatroomId;

      if (!channelId || !chatroomId) {
        this.channelInfo = await this.api.getChannelInfo(this.config.channel);
        channelId = this.channelInfo.id;
        chatroomId = this.channelInfo.chatroom.id;
      } else {
        this.channelInfo = { id: channelId, slug: this.config.channel };
      }

      this.chatClient = new ChatClient(chatroomId);
      await this.chatClient.connect();
      this.setupChatHandlers();

      console.log('='.repeat(60));
      console.log('Bot started and monitoring chat');
      console.log('='.repeat(60));

    } catch (error) {
      console.error('[ERROR]', error.message);
      process.exit(1);
    }
  }

  async stop() {
    if (this.chatClient) {
      this.chatClient.disconnect();
    }

    if (this.authServer) {
      this.authServer.stop();
    }

    process.exit(0);
  }
}

const bot = new KickAutoBanner();

process.on('SIGINT', () => bot.stop());
process.on('SIGTERM', () => bot.stop());
process.on('unhandledRejection', (error) => console.error('[ERROR]', error));
process.on('uncaughtException', (error) => {
  console.error('[ERROR]', error);
  process.exit(1);
});

bot.start();
