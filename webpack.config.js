const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './src/index.tsx',
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'cheap-module-source-map', // Évite eval() en développement
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.js',
      clean: true, // Nettoie le dossier dist avant chaque build
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
    ],
  },    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: 'public/manifest.json', to: 'manifest.json' },
          { from: 'public/*.png', to: '[name][ext]' },
          { from: 'public/*.svg', to: '[name][ext]' },
          { from: 'chart.js', to: 'chart.js' }, // Copy chart.js
          { from: 'background.js', to: 'background.js' }, // Copy background.js
          { from: 'popup.html', to: 'popup.html' }, // Copy notre popup.html avec glass design
          { from: 'popup.js', to: 'popup.js' }, // Copy popup.js
          { from: 'improvements.js', to: 'improvements.js' }, // Copy improvements.js
          { from: 'blocking-modes.js', to: 'blocking-modes.js' }, // Copy blocking-modes.js
          { from: 'blocked.html', to: 'blocked.html' }, // Copy blocked.html
        ],
      }),
    ],
  };
};