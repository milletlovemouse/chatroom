import path, { dirname } from 'path'
import { fileURLToPath } from "url"
import HtmlWebpackPlugin from 'html-webpack-plugin'
import Dotenv from 'dotenv-webpack'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config =  {
  entry: path.resolve(__dirname, '../src/index.tsx'),
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: '[name].[hash:8].js',
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'chatroom',
      template: path.resolve(__dirname, '../index.html'),
    }),
    new Dotenv({
      path: path.resolve(__dirname, '../.env'), // 指定环境变量文件路径
    })
  ],
  resolve: {
    // 配置 extensions 来告诉 webpack 在没有书写后缀时，以什么样的顺序去寻找文件
    extensions: ['.ts', '.tsx', '.mjs', '.js', '.json', '.jsx'], // 如果项目中只有 tsx 或 ts 可以将其写在最前面
    alias: {
      '@': path.resolve(__dirname, '../src/'),
      '/@': path.resolve(__dirname, '../src/'),
    },
  },
  module: {
    rules: [
      {
        test: /.(jsx?)|(tsx?)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    targets: 'iOS 9, Android 4.4, last 2 versions, > 0.2%, not dead', // 根据项目去配置
                    useBuiltIns: 'usage', // 会根据配置的目标环境找出需要的polyfill进行部分引入
                    corejs: 3, // 使用 core-js@3 版本
                  },
                ],
                ['@babel/preset-typescript'],
                ['@babel/preset-react'],
              ],
            },
          },
        ]
      },
      {
				test: /\.(png|jpe?g|gif|svg|webp)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 25 * 1024, // 25kb
          },
        },
        generator: {
          filename: 'assets/imgs/[name].[hash:8][ext]',
        },
      },
      {
        test: /\.(eot|ttf|woff|woff2)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 25 * 1024, // 25kb
          },
        },
        generator: {
          filename: 'assets/fonts/[name].[hash:8][ext]',
        },
      },
    ],
  }
}

export default config;