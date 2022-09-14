import { PostcssFileOptions } from '../index';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as mkdirp from 'mkdirp';
import urlJoin from 'url-join';

// the root directory
const rootDir = process.cwd();

/**
 * Copy asset and return the name of new file.
 *
 * @param file the absolute path of the file.
 * @param dest the destination folder.
 * @param data the file buffer.
 * @param hash use hash.
 */
const copyAsset = (file: string, dest: string, data: Buffer, hash?: boolean): string => {
	let filename: string;
	if (hash) {
		const extname = path.extname(file);
		const fileHash = crypto.createHash('md5').update(data).digest('hex');
		filename = fileHash + extname;
	} else {
		filename = path.basename(file);
	}
	if (!fs.existsSync(dest)) {
		mkdirp.sync(dest);
	}
	fs.writeFileSync(path.resolve(dest, filename), data);
	return filename;
};

export interface AssetHandlerOptions extends PostcssFileOptions {
	include?: any;
	exclude?: any;
	extensions?: any;
	importer: string;
	file: string;
}

/**
 * Handle asset and return the value of url.
 *
 * @param options
 * @returns the value of url
 */
export const handleAsset = (options: AssetHandlerOptions): string => {
	// this is to cover hash or search case, like url('./assets/icon.svg?734fa123521');
	const [ file, cleanFile, search ] = options.file.match(/(.+?)([\?\#].*)/) || ['', options.file, ''];
	const assetPath = path.resolve(path.dirname(options.importer), cleanFile);
	const data = fs.readFileSync(assetPath);
	// copy or inline
	switch (options.url) {
		// copy asset to the destination path
		case 'copy':
			const assetsPath = path.resolve(rootDir, options.assetsPath as string);
			const filename = copyAsset(assetPath, assetsPath, data, options.hash);
			if (options.publicPath) {
				let url = options.publicPath + filename;
				if (options.relativeSrc) {
					url = path.relative(
						path.dirname(options.importer),
						path.resolve(options.relativeSrc, url)
					).replace(/\\/g, '/');
				}
				return url;
			} else {
				return (options.assetsPathPrefix || '') + path.resolve('/', options.assetsPath as string, filename + search);
			}
		// insert the asset as a inline base64 code
		case 'inline':
			const type = path.extname(assetPath).replace('.', '');
			return `data:image/${type};base64,${data.toString('base64')}`;
		// do nothing if it has a invalid url option
		default:
			return options.file + search;
	}
};
