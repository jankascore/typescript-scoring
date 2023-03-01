import * as path from 'path';
import webpack from 'webpack';
import Terser from 'terser-webpack-plugin'
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const config: webpack.Configuration = {
	mode: 'production',
	entry: './src/index.ts',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'calc.txt',
		library: {
			type: 'assign',
			name: 'calc',
		}
	},
	experiments: {
		outputModule: true
	},
	resolve: {
		extensions: ['.ts', '.js'],
	},
	module: {
		rules: [
			{ test: /\.ts/, loader: 'ts-loader', options: { configFile: 'tsconfig.webpack.json'} }
		]
	},
	optimization: {
		minimize: false,
		minimizer: [new Terser()]
	}
}

export default config;