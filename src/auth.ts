import * as jwt from 'jsonwebtoken';

const defaultIssuer = 'indra'; // FIXME: this is typically a url; it should be the hub's url
const defaultSigningAlgorithm = 'RS256';

export class AuthService {

  private audience: string;

  private privateKey: string;
  private publicKey: string;

  constructor(
    audience: string,
    privateKey: string,
    publicKey: string,
  ) {
    this.audience = audience;
    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }

  async vendBearerJWT(
    subject: string,
    ttl: number,
    permissions: any,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const claims = {
        nats: {
          permissions: permissions,
        },
      };

      const signer = { key: this.privateKey } as jwt.Secret;
      const options = {
        algorithm: defaultSigningAlgorithm,
        audience: this.audience,
        subject: subject,
        issuer: defaultIssuer,
        expiresIn: ttl,
      } as jwt.SignOptions;

      try {
        const token = jwt.sign(claims, signer, options);
        console.log(`Signed ${token.length}-byte bearer authorization token for subject: ${subject}`);
        resolve(token);
      } catch (err) {
        console.log(`Failed to vend NATS bearer JWT for subject: ${subject}; ${err}`);
        reject(err);
      }
    });
  }

  verifyBearerJWT(token: string): boolean {
    let verified = false;
    jwt.verify(token, this.publicKey, { algorithms: [defaultSigningAlgorithm] }, (err) => {
      if (err) {
        console.log(`NATS bearer JWT verification failed; ${err}`);
        verified = false;
      }
    });

    return verified;
  }
}
