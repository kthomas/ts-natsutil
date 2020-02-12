import { NatsService } from './nats';
import { NatsWebsocketService } from './natsws';

export * from './auth';
export * from './env';
export * from './nats';
export * from './natsws';

const messagingServiceTypeNats = 'nats';
const messagingServiceTypeWebsocket = 'ws';

export interface INatsService {
  connect(): Promise<any>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  publish(subject: string, payload: any, reply?: string): Promise<void>;
  publishCount(): number;
  request(subject: string, timeout: number, data?: any): Promise<any | void>;
  subscribe(subject: string, callback: (msg: any, err?: any) => void): Promise<INatsSubscription>;
  unsubscribe(subject: string);
  flush(): Promise<void>;
}

export interface INatsStreamingService {
  attemptNack(conn: any, msg: any, timeout: number);
  nack(conn: any, msg: any);
  shouldDeadletter(msg: any, deadletterTimeout: number): boolean;
}

export interface INatsSubscription {
  unsubscribe();
}

export function natsServiceFactory(config: any): INatsService {
  const { natsServers, bearerToken, token } = config;
  if (!natsServers) {
    throw new Error('No NATS servers or websocket endpoints provided; check config');
  }

  let serviceType;

  if (typeof natsServers === 'string') {
    if (natsServers.startsWith('nats://')) {
      serviceType = messagingServiceTypeNats;
    } else if (natsServers.startsWith('ws://') || natsServers.startsWith('wss://')) {
      serviceType = messagingServiceTypeWebsocket;
    }
  } else if (natsServers.length > 0 && natsServers[0] && natsServers[0].startsWith('nats://')) {
    serviceType = messagingServiceTypeNats;
  } else if (natsServers.length > 0 && natsServers[0] && natsServers[0].startsWith('ws://') || natsServers[0].startsWith('wss://')) {
    serviceType = messagingServiceTypeWebsocket;
  }

  if (serviceType === messagingServiceTypeNats) {
    return new NatsService(natsServers, bearerToken, token);
  } else if (serviceType === messagingServiceTypeWebsocket) {
    return new NatsWebsocketService(natsServers, bearerToken, token);
  }

  throw new Error('Invalid NATS config; unable to resolve protocol; check config');
}
