import * as natsws from '@provide/nats.ws'
import { Config } from './env'

const uuidv4 = require('uuid/v4')

class NatsWebsocketUtil {

  private config: Config
  private clusterId: string | undefined | null
  private servers: string[]
  private token?: string | undefined | null
  private bearerToken: string | undefined | null

  constructor(clusterId: string | undefined | null, servers?: string[], bearerToken?: string | undefined | null, token?: string | undefined | null) {
    this.bearerToken = bearerToken
    this.config = Config.fromEnv()
    this.clusterId = clusterId ? clusterId : this.config.natsClusterId
    this.servers = servers ? servers : (this.config.natsServers || '').split(',')
    this.token = token ? token : this.config.natsToken
  }

  getNatsConnectionOpts(clientId?: string): any {
    return {
      encoding: this.config.natsEncoding,
      json: this.config.natsJson,
      name: clientId || `${this.config.natsClientPrefix}-${uuidv4()}`,
      reconnect: true,
      maxPingOut: this.config.natsMaxPingOut,
      maxReconnectAttempts: -1, // reconnect dammit! (see reconnectTimeWait when it's time to make this a bit more intelligent)
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
    }
  }

  async getNatsWebsocketConnection(opts?: natsws.NatsConnectionOptions): Promise<natsws.NatsConnection> {
    const clientId = opts ? opts.name : `${this.config.natsClientPrefix}-${uuidv4()}`
    try {
      if (!opts) {
        opts = this.getNatsConnectionOpts(clientId) as natsws.NatsConnectionOptions
      }
      return natsws.connect(opts)
    } catch (err) {
      console.log(`Error establishing NATS connection: ${clientId}; ${err}"`)
      return Promise.reject(err)
    }
  }

  async attemptNack(conn: natsws.NatsConnection, msg: natsws.Message, timeout: number) {
    if (this.shouldDeadletter(msg, timeout)) {
      this.nack(conn, msg)
    }
  }

  async nack(conn: natsws.NatsConnection, msg: natsws.Message) {
    try {
      conn.publish(this.config.natsDeadLetterSubject, msg.getRawData())
    } catch (err) {
      console.log(`Error Nacking NATS message on subject: ${msg.getSubject}; ${err}"`)
    }
  }
  
  shouldDeadletter(msg: natsws.Message, deadletterTimeout: number): boolean {
    return msg.isRedelivered() && ((new Date().getTime()) / 1000) - (msg.getTimestamp().getTime() / 1000) >= deadletterTimeout
  }
}

export default NatsWebsocketUtil
