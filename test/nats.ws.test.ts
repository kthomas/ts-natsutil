import * as jwt from 'jsonwebtoken';
const generateRSAKeypair = require('generate-rsa-keypair');

import { NatsWebsocketService } from '../src/natsws';

const natsServers = ['wss://localhost:4221'];

const validSigningKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAqU/GXp8MqmugQyRk5FUFBvlJt1/h7L3Crzlzejz/OxriZdq/
lBNQW9S1kzGc7qjXprZ1Kg3zP6irr6wmvP0WYBGltWs2cWUAmxh0PSxuKdT/OyL9
w+rjKLh4yo3ex6DX3Ij0iP01Ej2POe5WrPDS8j6LT0s4HZ1FprL5h7RUQWV3cO4p
F+1kl6HlBpNzEQzocW9ig4DNdSeUENARHWoCixE1gFYo9RXm7acqgqCk3ihdJRIb
O4e/m1aZq2mvAFK+yHTIWBL0p5PF0Fe8zcWdNeEATYB+eRdNJ3jjS8447YrcbQcB
QmhFjk8hbCnc3Rv3HvAapk8xDFhImdVF1ffDFwIDAQABAoIBAGZIs2ZmX5h0/JST
YAAw/KCB6W7Glg4XdY21/3VRdD+Ytj0iMaqbIGjZz/fkeRIVHnKwt4d4dgN3OoEe
VyjFHMdc4eb/phxLEFqiI1bxiHvtGWP4d6XsON9Y0mBL5NJk8QNiGZjIn08tsWEm
A2bm9gkyj6aPoo8BfBqA9Q5uepgmYIPT2NtEXvTbd2dedAEJDJspHKHqBfcuNBVo
VhUixVSgehWGGP4GX+FvAEHbawDrwULkMvgblH+X8nBtzikp29LNpOZSRRbqF/Da
0AkluFvuDUUIzitjZs5koSEAteaulkZO08BMxtovQjh/ZPtVZKZ27POCNOgRsbm/
lVIXRMECgYEA2TQQ2Xy6eO5XfbiT4ZD1Z1xe9B6Ti7J2fC0ZNNSXs4DzdYVcHNIu
ZqfK6fGqmByvSnFut7n5Po0z2FdXc7xcKFJdBZdFP3GLXbN9vpRPIk9b6n+0df47
1uTYwVocmAGXez++y73j5XzHQQW4WmmC5SlKjQUWCGkuzISVjRDtlZ0CgYEAx43K
PrJxSijjE2+VWYjNFVuv6KilnWoA8I2cZ7TtPi4h//r5vyOUst0egR3lJ7rBof74
VttQPvqAk3GN697IrE/bSwefwG2lM1Ta0KB3jn6b/iT4ckmaOB+v6aDHq/GPW6l/
sxD0RIEelRYZlsNLepRgKhcQckhjnWzQuGWSl0MCgYBYJQ0BdeCm2vKejp1U2OL+
Qzo1j4MJGi+DTToBepTlv9sNQkWTXKh/+HAcaHp2qI1qhIYOAWbov5zemvNegH5V
zrb5Yd40VPvd1s2c3csPfW0ryQ+PItFd8BkWvl8EQQEcf04KmNE3fF/QP2YFKvR3
0z3x5LKAT08yqEuYp9oC8QKBgQCfc9XqGU3bEya3Lg8ptt0gtt2ty6xiRwSvMoiK
eZCkgdpbH6EWMQktjvBD/a5Q+7KjjgfD54SMfj/lEPR1R9QTk8/HeTUWXsaFaMVb
tQ0zSEm/Xq1DLTrUo8U9qmJCK0gA10SZwe9dGctlF36k8DJMpWjd2QYkO2GVthBl
d4wV3wKBgC7S4q0wmcrQIjyDIFmISQNdOAJhR0pJXG8mK2jECbEXxbKkAJnLj73D
J+1OVBlx4HXx54PiEkV3M3iTinf5tBSi8nA2D3s829F65XKFli1RC4rJv+2ygH8P
nXX9rQKhK/v6/jeelKquH8zy894hLZe7feSsWV9GMgb5l9p+UzWB
-----END RSA PRIVATE KEY-----`

// Use the following public key for verification:
// -----BEGIN PUBLIC KEY-----
// MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqU/GXp8MqmugQyRk5FUF
// BvlJt1/h7L3Crzlzejz/OxriZdq/lBNQW9S1kzGc7qjXprZ1Kg3zP6irr6wmvP0W
// YBGltWs2cWUAmxh0PSxuKdT/OyL9w+rjKLh4yo3ex6DX3Ij0iP01Ej2POe5WrPDS
// 8j6LT0s4HZ1FprL5h7RUQWV3cO4pF+1kl6HlBpNzEQzocW9ig4DNdSeUENARHWoC
// ixE1gFYo9RXm7acqgqCk3ihdJRIbO4e/m1aZq2mvAFK+yHTIWBL0p5PF0Fe8zcWd
// NeEATYB+eRdNJ3jjS8447YrcbQcBQmhFjk8hbCnc3Rv3HvAapk8xDFhImdVF1ffD
// FwIDAQAB
// -----END PUBLIC KEY-----

const vendJWT = (ttl: number, permissions: any, privateKey?: string): string | undefined | null => {
  try {
    return jwt.sign({
      nats: {
        permissions: permissions,
      },
    }, { key: privateKey } as jwt.Secret, { 
      algorithm: 'RS256',
      audience: 'nats-server',
      subject: '0x',
      issuer: 'ts-natsutil',
      expiresIn: ttl,
    } as jwt.SignOptions)
  } catch (e) {
    console.log(e)
  }
  return null;
};

const vendRSAKeypair = (): any => {
  return generateRSAKeypair();
};

test('when the bearer token is not present', async () => {
  const service = new NatsWebsocketService(natsServers);
  await service.connect();
  expect(service.isConnected()).toBeFalsy();
});

test('when the bearer token is present but signed by the wrong authority', async () => {
  const signer = vendRSAKeypair();
  const token = vendJWT(10, [], signer.private);
  const service = new NatsWebsocketService(natsServers, token);
  await service.connect();
  expect(service.isConnected()).toBeFalsy();
});

test('when the bearer token is present and signed by the appropriate authority', async () => {
  const token = vendJWT(10, {publish: {'allow': ['auth.>']}, subscribe: {}, responses: {}}, validSigningKey);
  const service = new NatsWebsocketService(natsServers, token);
  await service.connect();
  expect(service.isConnected()).toBeTruthy();
});

// test('when the bearer token authorizes a specific response permission', async () => {
//   const conn = await client.getNatsConnection()
//   console.log(conn)
//   expect(conn).toBeTruthy()
// });
