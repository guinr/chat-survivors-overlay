const { createApp } = Vue;

createApp({
  data() {
    return {
      debug: true,
      tab: 'STATUS',
      needsPermission: true,
      retractStatusBar: false,
      username: undefined,
      playerColor: '',
      level: 0,
      experience: 0,
      experience_to_next_level: 0,
      hp: { actual: 0, max: 100 },
      attributes: { strength: 0, agility: 0, vitality: 0, luck: 0 },
      attributePoints: 0,
      ws: null,
      logs: [],
      API_URL: 'https://chat-survivors-overlay-server.onrender.com'
    };
  },
  computed: {
    isPlaying() {
      return this.level > 0;
    },
    nameColorStyle() {
      if (!this.playerColor) return 'rgb(209, 182, 145)';
      const parts = this.playerColor
        .replace(/[()]/g, '')
        .split(',')
        .map(v => parseFloat(v.trim()));

      if (parts.length !== 4) return '';

      const [r, g, b, a] = parts;
      return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
    },
    hpBarStyle() {
      const percent = this.hp.max > 0 ? (this.hp.actual / this.hp.max) * 100 : 0;
      let color = '#7cbb4e';

      if (percent <= 33) {
        color = '#db4c4c';
      }

      return {
        width: `calc(${percent}% - 12px)`,
        backgroundColor: color
      };
    },
    xpBarStyle() {
      const percent = this.experience_to_next_level > 0
        ? (this.experience / this.experience_to_next_level) * 100
        : 0;

      return {
        width: `${Math.min(percent, 100)}%`
      };
    }
  },
  methods: {
    log(message) {
      const time = new Date().toLocaleTimeString('pt-BR');
      this.logs.push({ time, message });
      if (this.logs.length > 100) this.logs.shift();
    },
    connectWebSocket() {
      this.ws = new WebSocket('wss://chat-survivors-overlay-server.onrender.com');
      this.ws.onopen = () => this.log('WebSocket conectado.');

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (
            data.action === 'status_broadcast' &&
            data.status.name.toLowerCase() === this.username.toLowerCase()
          ) {
            this.delayedUpdateStatus(data.status);
            this.playerColor = data.status.color;
          }
        } catch (e) {
          this.log('Erro ao processar mensagem WS.');
        }
      };

      this.ws.onerror = () => this.log('Erro no WebSocket.');
      this.ws.onclose = () => {
        this.log('WebSocket desconectado. Reconectando em 3s...');
        setTimeout(this.connectWebSocket, 1000);
      };
    },
    join() {
      this.ws.send(JSON.stringify({
        name: this.username,
        action: 'join'
      }));
      this.log(`Enviado: join (${this.username})`);
    },
    async fetchUserInfo(authToken) {
      try {
        const res = await fetch(`${this.API_URL}/get-username`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        const data = await res.json();
        this.username = data.username;
        this.needsPermission = this.username === undefined;
        if (data.status) {
          this.updateStatus(data.status);
          this.playerColor = data.status.color;
        }
      } catch (e) {
        this.needsPermission = true;
        this.username = '';
        this.log('Erro ao buscar usuário.');
      }
    },
    delayedUpdateStatus(status) {
      setTimeout(() => this.updateStatus(status), this.debug ? 0 : 2000);
    },
    updateStatus(status) {
      if (status.actual_health === 0) {
        status.color = '(255, 255, 255, 1)';
        this.playerColor = null;
        this.level = 0;
        this.experience = 0;
        this.experience_to_next_level = 0;
        this.hp = { actual: 0, max: 100 };
        this.attributePoints = 0;
        this.attributes = { strength: 0, agility: 0, vitality: 0, luck: 0 };
        return;
      }

      this.level = status.level;
      this.experience = status.experience;
      this.experience_to_next_level = status.experience_to_next_level;
      this.hp = { actual: status.actual_health, max: status.max_health };
      this.attributePoints = status.available_stat_points;
      this.attributes = {
        strength: status.attributes.strength,
        agility: status.attributes.agility,
        vitality: status.attributes.vitality,
        luck: status.attributes.luck
      };
    },
    upgradeAttribute(attr) {
      this.ws.send(JSON.stringify({
        name: this.username,
        action: attr.slice(0, 3),
        value: 1
      }));
      this.log(`Upgrade enviado: ${attr}`);
    },
    requestAuthorization() {
      window.Twitch.ext.onAuthorized(({ token }) => {
        this.fetchUserInfo(token);
      });
    }
  },
  mounted() {
  this.connectWebSocket();

  const fallbackTimeout = setTimeout(() => {
    if (!this.username && this.debug) {
      this.username = 'digimoes';
      this.needsPermission = false;
    }
  }, 2000);

  if (window.Twitch && window.Twitch.ext) {
    window.Twitch.ext.onAuthorized(({ token }) => {
      clearTimeout(fallbackTimeout);
      this.fetchUserInfo(token);
    });
  }
}

}).mount('#app');
