const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  mode: 'development',
  entry: {
      main: './index.js'
  },
  devtool: 'inline-source-map',
  devServer: {
    contentBase:'./dist',
    injectClient: false,
    proxy: {
    }
  },
  output: {
    filename: '[name].js',
    path: __dirname + '/dist'
  },
  optimization: {
    //usedExports: true,
    //minimize: true,
    //sideEffects: false
  },
  resolve: {
         extensions: [".ts", ".js"]
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "ts-loader",
        options: {
            configFile: 'tsconfig.json'
        }
      },
      {
        test: /\.scss$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader']
      },
      {
        test: /\.html$/,
        loader: "file-loader",
        options: {
          name: '[name].[ext]',
        },
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'style.css',
    }),
    new BundleAnalyzerPlugin()
  ]
};