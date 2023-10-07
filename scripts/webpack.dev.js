const { merge } = require('webpack-merge')
const base = require('./webpack.base.js')
const Dotenv = require('dotenv-webpack');

module.exports = merge(base, {
  mode: 'development',
  devServer: {
	  open: true, // 编译完自动打开浏览器
    port: 8080,
  },
  plugins: [
    new Dotenv({
      path: '../.env.development', // 指定环境变量文件路径
    }),
  ],
  module: {
    rules: [
      {
        test: /\.less$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {		
              postcssOptions: {
                plugins: [['postcss-preset-env', {}]]
              },
            },
          },
          'less-loader',
        ],
        // 排除 node_modules 目录
        exclude: /node_modules/,
      },
    ],
  },
})