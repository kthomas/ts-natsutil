import * as natsws from '@provide/nats.ws';
import { Config } from './env';
import { INatsService } from '.';

const uuidv4 = require('uuid/v4');

export class NatsWebsocketService implements INatsService {

  private bearerToken: string | undefined | null;
  private config: Config;
  private connection?: natsws.Client | null;
  private pubCount = 0;
  private servers: string[];
  private subscriptions: { [key: string]: any } = {};
  private token?: string | undefined | null;

  constructor(
    servers?: string[],
    bearerToken?: string | undefined | null,
    token?: string | undefined | null
  ) {
    this.bearerToken = bearerToken;
    this.config = Config.fromEnv();
    this.servers = servers ? servers : (this.config.natsServers || '').split(',');
    this.token = token ? token : this.config.natsToken;
  }

  async connect(): Promise<any> {
    if (this.connection && !this.connection.isClosed()) {
      console.log('Attempted to establish NATS connection short-circuirted; connection is already open');
      return Promise.resolve(this.connection);
    }

    const clientId = `${this.config.natsClientPrefix}-${uuidv4()}`;
    try {
      natsws.connect({
        encoding: this.config.natsEncoding,
        json: this.config.natsJson,
        name: clientId,
        reconnect: true,
        maxPingOut: this.config.natsMaxPingOut,
        maxReconnectAttempts: -1,
        noEcho: this.config.natsNoEcho,
        noRandomize: false,
        pingInterval: this.config.natsPingInterval,
        servers: this.servers,
        token: this.token,
        tls: this.config.natsTlsOptions,
        userJWT: this.bearerToken,
        pedantic: this.config.natsPedantic,
        verbose: this.config.natsVerbose,
        url: this.servers[0],
      } as natsws.NatsConnectionOptions).then((nc) => {
        this.connection = nc;

        nc.on('close', () => {
          console.log('Connection closed');
          this.connection = null;
        });

        nc.on('error', () => {
          if (nc.isClosed()) {
            console.log('Connection closed');
            this.connection = null;
          }
        });

        return Promise.resolve(nc);
      }).catch((err) => {
        console.log(`Error establishing NATS connection: ${clientId}; ${err}"`);
        return Promise.reject(err);
      });
    } catch (err) {
      console.log(`Error establishing NATS connection: ${clientId}; ${err}"`);
      return Promise.reject(err);
    }
  }

  async disconnect(): Promise<void> {
    this.assertConnected();
    this.connection?.drain();
    this.connection?.close();
    this.connection = null;
  }

  isConnected(): boolean {
    return this.connection ? this.connection?.isClosed() : false;
  }

  async publish(subject: string, payload: any, reply?: string | undefined): Promise<void> {
    this.assertConnected();
    this.connection?.publish(subject, payload, reply);
    this.pubCount++;
  }

  publishCount(): number {
    return this.pubCount;
  }

  async request(subject: string, timeout: number, data?: any): Promise<any> {
    this.assertConnected();
    await this.connection?.request(subject, timeout, data).then((msg) => {
      return Promise.resolve(msg);
    }).catch((err) => {
      console.log(`NATS request failed; ${err}`);
      return Promise.reject(err);
    });
  }

  async subscribe(subject: string, callback: (msg: any) => void): Promise<any> {
    this.assertConnected();
    await this.connection?.subscribe(subject, callback).then((sub) => {
      this.subscriptions[subject] = sub;
      return Promise.resolve(sub);
    }).catch((err) => {
      console.log(`NATS subscription failed; ${err}`);
      return Promise.reject(err);
    });
  }

  async unsubscribe(subject: string) {
    this.assertConnected();
    const sub = this.subscriptions[subject];
    if (!sub) {
      console.log(`Unable to unsubscribe from subject: ${subject}; subscription not found`);
      return;
    }

    sub.unsubscribe();
    delete this.subscriptions[subject];
  }

  async flush(): Promise<void> {
    this.assertConnected();
    return this.connection?.flush();
  }

  private assertConnected(): void {
    if (!this.connection) {
      throw new Error('No connection established');
    }

    if (this.connection.isClosed()) {
      throw new Error(`Connection is closed`);
    }
  }
}
