import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKENS_FILE = path.join(__dirname, '..', 'tokens.json');

export class OAuthServer {
  constructor(config) {
    this.config = config;
    this.app = express();
    this.server = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.codeVerifier = null;
    this.state = null;
  }

  // Генерация PKCE параметров
  generatePKCE() {
    // code_verifier - случайная строка 43-128 символов
    this.codeVerifier = crypto.randomBytes(32).toString('base64url');

    // code_challenge - SHA256 hash от code_verifier
    const hash = crypto.createHash('sha256').update(this.codeVerifier).digest();
    const codeChallenge = hash.toString('base64url');

    return codeChallenge;
  }

  // Генерация state для защиты от CSRF
  generateState() {
    this.state = crypto.randomBytes(16).toString('hex');
    return this.state;
  }

  async loadTokens() {
    try {
      const data = await fs.readFile(TOKENS_FILE, 'utf-8');
      const tokens = JSON.parse(data);
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
      return true;
    } catch (error) {
      return false;
    }
  }

  async saveTokens() {
    const tokens = {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      updatedAt: new Date().toISOString()
    };
    await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2));
  }

  async start() {
    const hasTokens = await this.loadTokens();

    if (hasTokens) {
      return this.accessToken;
    }

    return new Promise((resolve, reject) => {
      this.app.get('/auth', (req, res) => {
        const codeChallenge = this.generatePKCE();
        const state = this.generateState();

        const scopesString = this.config.oauth.scopes.join(' ');

        const params = new URLSearchParams({
          client_id: this.config.oauth.clientId,
          redirect_uri: this.config.oauth.redirectUri,
          response_type: 'code',
          scope: scopesString,
          state: state,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256'
        });

        const authUrl = `https://id.kick.com/oauth/authorize?${params.toString()}`;
        res.redirect(authUrl);
      });

      // Извлекаем путь из redirect_uri для callback route
      const callbackPath = new URL(this.config.oauth.redirectUri).pathname;

      this.app.get(callbackPath, async (req, res) => {
        const { code, error, state } = req.query;

        if (error) {
          res.send('Ошибка авторизации. Закройте это окно и попробуйте снова.');
          reject(new Error(error));
          return;
        }

        if (state !== this.state) {
          res.send('Ошибка безопасности. Закройте это окно и попробуйте снова.');
          reject(new Error('Invalid state'));
          return;
        }

        try {
          const params = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: this.config.oauth.clientId,
            client_secret: this.config.oauth.clientSecret,
            redirect_uri: this.config.oauth.redirectUri,
            code: code,
            code_verifier: this.codeVerifier
          });

          const response = await axios.post('https://id.kick.com/oauth/token', params.toString(), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
            }
          });

          this.accessToken = response.data.access_token;
          this.refreshToken = response.data.refresh_token;

          await this.saveTokens();

          res.send('Авторизация успешна! Можете закрыть это окно.');

          setTimeout(() => {
            this.stop();
            resolve(this.accessToken);
          }, 1000);

        } catch (error) {
          res.send('Ошибка при получении токена. Закройте это окно.');
          reject(error);
        }
      });

      this.server = this.app.listen(this.config.server.port, () => {
        console.log(`[AUTH] OAuth сервер запущен на http://localhost:${this.config.server.port}`);
        console.log(`[AUTH] Откройте браузер и перейдите по адресу: http://localhost:${this.config.server.port}/auth`);
      });
    });
  }

  async refreshAccessToken() {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.config.oauth.clientId,
      client_secret: this.config.oauth.clientSecret,
      refresh_token: this.refreshToken
    });

    const response = await axios.post('https://id.kick.com/oauth/token', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });

    this.accessToken = response.data.access_token;
    if (response.data.refresh_token) {
      this.refreshToken = response.data.refresh_token;
    }

    await this.saveTokens();
    return this.accessToken;
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }

  getAccessToken() {
    return this.accessToken;
  }
}
