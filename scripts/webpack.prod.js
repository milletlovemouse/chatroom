import path, { dirname } from 'path'
import { fileURLToPath } from "url"
import { merge } from 'webpack-merge'
import config  from './webpack.config.js'
import MiniCssExtractPlugin  from 'mini-css-extract-plugin'
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import Dotenv from 'dotenv-webpack'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prodConfig = merge(config, {
  mode: 'production',
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'assets/css/[hash:8].css', // 将css单独提测出来放在assets/css 下
    }),
    new Dotenv({
      path: path.resolve(__dirname, '../.env.production'), // 指定环境变量文件路径
    })
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: getStylePlugin({
          importLoaders: 1
        })
      },
      {
        test: /\.less$/,
        use: [
          ...getStylePlugin({
            importLoaders: 2
          }),
          'less-loader',
        ],
        // 排除 node_modules 目录
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    usedExports: true,
    minimize: true,
    minimizer: [
      // 在 webpack@5 中，你可以使用 `...` 语法来扩展现有的 minimizer（即 `terser-webpack-plugin`），将下一行取消注释
      // `...`,
      new CssMinimizerPlugin({
        // 默认开启
        // parallel true:  // 多进程并发执行，提升构建速度 。 运行时默认的并发数：os.cpus().length - 1
      }),
      new TerserPlugin()
    ],
  },
})

function getStylePlugin(cssLoaderOptions) {
  return [
    MiniCssExtractPlugin.loader,
    {
      loader: "css-loader",
      options: {
        modules: true,
        ...cssLoaderOptions
      },
    },
    {
      loader: 'postcss-loader',
      options: {
        // 它可以帮助我们将一些现代的 CSS 特性，转成大多数浏览器认识的 CSS，并且会根据目标浏览器或运行时环境添加所需的 polyfill；
        // 也包括会自动帮助我们添加 autoprefixer
        postcssOptions: {
          plugins: [['postcss-preset-env', {}]],
        },
      },
    },
  ]
}

export default prodConfig
