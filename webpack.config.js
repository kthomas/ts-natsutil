const path = require('path');

module.exports = {
  entry: './src/nats.ts',
  target: 'node', //'web',
  externals: [],
  output: {
    path: path.resolve('dist'),
    filename: 'ts-natsutil.js'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  }
};
