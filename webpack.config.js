const path = require('path')
const nodeExternals = require('webpack-node-externals');

module.exports = {
  mode: 'production',
  entry: path.resolve(__dirname, 'src', 'index.ts'),
  externals: [
    nodeExternals({
      modulesDir: path.resolve(__dirname, './node_modules'),
      whitelist: ['@provide/nats.ws'],
    }),
  ],
  output: {
    path: path.resolve(__dirname, 'dist', 'umd'),
    filename: 'index.js',
    libraryTarget: 'umd',
    library: 'natsutil',
    globalObject: 'this'
  },
  resolve: {
    extensions: ['.js', '.ts'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "ts-loader",
        exclude:  /(node_modules|test)/,
      },
    ],
  }
};
