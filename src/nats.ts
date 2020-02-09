import * as natsws from '@provide/nats.ws' // FIXME
import * as nats from 'ts-nats'
import * as stan from 'node-nats-streaming'
import { TlsOptions } from 'tls'

const uuidv4 = require('uuid/v4')

class Config {

  static camelize(str: string, sep: string): string {
    const split = str.split(sep)

    return split.reduce((acc: string, curr: string, i) => {
      if (i === 0) {
        return curr.toLowerCase()
      }

      return (acc + curr.charAt(0).toUpperCase() + curr.slice(1).toLowerCase())
    }, '')
  }

  static fromEnv(overrides?: Partial<Config>): Config {
    const instance = new Config();
    for (const [k, v] of Object.entries(process.env)) {
      if (v !== undefined) {
        (instance as any)[Config.camelize(k, '_')] = v
      }
    }

    for (let key in (overrides || {})) {
      (instance as any)[key] = (overrides as any)[key]
    }

    return instance
  }

  public natsClientPrefix: string = process.env.NATS_CLIENT_PREFIX || 'ts-natsutil'
  public natsClusterId?: string = process.env.NATS_CLUSTER_ID
  public natsDeadLetterSubject: string = process.env.NATS_DEADLETTER_SUBJECT || 'nats.deadletter'
  public natsEncoding: BufferEncoding = (process.env.NATS_BUFFER_ENCODING || 'utf-8') as BufferEncoding
  public natsJson: boolean | true = process.env.NATS_JSON === 'true'
  public natsMaxPingOut: number = process.env.NATS_MAX_UNACKED_PINGS ? parseInt(process.env.NATS_MAX_UNACKED_PINGS) : 2
  public natsNoEcho: boolean | false = process.env.NATS_NO_ECHO === 'true'
  public natsPedantic: boolean | false = process.env.NATS_PEDANTIC === 'true'
  public natsPingInterval: number = process.env.NATS_PING_INTERVAL ? parseInt(process.env.NATS_PING_INTERVAL) : 120000
  public natsServers?: string = process.env.NATS_SERVERS
  public natsTlsConfigured: boolean = !!process.env.NATS_TLS_KEY && !!process.env.NATS_TLS_CERTIFICATE && !!process.env.NATS_CA_CERTIFICATE
  public natsTlsOptions?: TlsOptions = this.natsTlsConfigured ? {
    // key: fs.readFileSync(process.env.NATS_TLS_KEY),
    // cert: fs.readFileSync(process.env.NATS_TLS_CERTIFICATE),
    // ca: [ fs.readFileSync(process.env.NATS_CA_CERTIFICATE) ],
    rejectUnauthorized: !(process.env.NATS_FORCE_TLS === 'true'),
  } as TlsOptions : undefined
  public natsToken?: string = process.env.NATS_TOKEN
  public natsVerbose: boolean | false = process.env.NATS_VERBOSE === 'true'
}

class NatsUtil {

  private config: Config
  private clusterId: string
  private servers: string[]
  private token?: string
  private bearerToken?: string

  constructor(clusterId: string, servers?: string[], bearerToken?: string, token?: string) {
    this.bearerToken = bearerToken
    this.config = Config.fromEnv()
    this.clusterId = clusterId ? clusterId : this.config.natsClusterId
    this.servers = servers ? servers : this.config.natsServers.split(',')
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

  getNatsStreamingClientOpts(natsConnectionOpts: nats.NatsConnectionOptions, natsClient: nats.Client): stan.ClientOpts {
    const opts = natsConnectionOpts as stan.StanOptions;
    return {
      // url?: string,
      // connectTimeout?: number,
      // ackTimeout?: number,
      // discoverPrefix?: string,
      // maxPubAcksInflight?: number,
      // stanEncoding?: string,
      // stanMaxPingOut?: number,
      // stanPingInterval: number,
      nc: natsClient,
    } as stan.ClientOpts
  }

  async getNatsConnection(opts?: nats.NatsConnectionOptions): Promise<nats.Client> {
    const clientId = opts ? opts.name : `${this.config.natsClientPrefix}-${uuidv4()}`
    try {
      if (!opts) {
        opts = this.getNatsConnectionOpts(clientId) as nats.NatsConnectionOptions
      }
      return nats.connect(opts)
    } catch (err) {
      console.log(`Error establishing NATS connection: ${clientId}; ${err}"`)
      return Promise.reject(err)
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

  async getNatsStreamingConnection(): Promise<stan.Stan> {
    let clientId: string
    // const clientId = `${this.config.natsClientPrefix}-${uuidv4()}-${this.clusterId}-${uuidv4()}`
    try {
      const natsConnectionOpts = this.getNatsConnectionOpts()
      const natsClient = await this.getNatsConnection()
      const opts = this.getNatsStreamingClientOpts(natsConnectionOpts, natsClient)
      clientId = opts.name
      return stan.connect(this.clusterId, clientId, opts)
    } catch (err) {
      console.log(`Error establishing NATS streaming connection: ${clientId}; ${err}"`)
      return Promise.reject(err)
    }
  }

  async attemptNack(conn: stan.Stan, msg: stan.Message, timeout: number) {
    if (this.shouldDeadletter(msg, timeout)) {
      this.nack(conn, msg)
    }
  }

  async nack(conn: stan.Stan, msg: stan.Message) {
    try {
      conn.publish(this.config.natsDeadLetterSubject, msg.getRawData())
    } catch (err) {
      console.log(`Error Nacking NATS message on subject: ${msg.getSubject}; ${err}"`)
    }
  }
  
  shouldDeadletter(msg: stan.Message, deadletterTimeout: number): boolean {
    return msg.isRedelivered() && ((new Date().getTime()) / 1000) - (msg.getTimestamp().getTime() / 1000) >= deadletterTimeout
  }
}

export default NatsUtil
