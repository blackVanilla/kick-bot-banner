import Pusher from 'pusher-js';

export class ChatClient {
  constructor(chatroomId) {
    this.chatroomId = chatroomId;
    this.pusher = null;
    this.channel = null;
    this.eventHandlers = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.pusher = new Pusher('32cbd69e4b950bf97679', {
          cluster: 'us2',
          wsHost: 'ws-us2.pusher.com',
          wsPort: 443,
          wssPort: 443,
          forceTLS: true,
          enabledTransports: ['ws', 'wss'],
          disableStats: true,
          authEndpoint: 'https://kick.com/broadcasting/auth',
        });

        this.pusher.connection.bind('error', (err) => {
          reject(err);
        });

        const channelName = `chatrooms.${this.chatroomId}.v2`;
        this.channel = this.pusher.subscribe(channelName);

        this.channel.bind('pusher:subscription_succeeded', () => {
          resolve();
        });

        this.channel.bind('pusher:subscription_error', (error) => {
          reject(error);
        });

        this.setupEventListeners();

      } catch (error) {
        reject(error);
      }
    });
  }

  setupEventListeners() {
    this.channel.bind('App\\Events\\ChatMessageEvent', (data) => {
      this.emit('message', data);
    });
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  emit(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[CHAT] Ошибка в обработчике события ${event}:`, error);
        }
      });
    }
  }

  disconnect() {
    if (this.channel) {
      this.pusher.unsubscribe(`chatrooms.${this.chatroomId}.v2`);
    }
    if (this.pusher) {
      this.pusher.disconnect();
    }
  }
}
