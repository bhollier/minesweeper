const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const InjectBodyPlugin = require('inject-body-webpack-plugin').default

module.exports = {
    entry: './src/main.ts',
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            }
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true
    },
    devServer: {
        open: true
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'Minesweeper',
            meta: {
                viewport: 'width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no',
            },
        }),
        new InjectBodyPlugin({
            content: `<canvas id='canvas'></canvas>`
        })
    ]
};