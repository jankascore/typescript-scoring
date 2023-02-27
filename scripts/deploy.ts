import {create} from 'ipfs-http-client';
import fs from 'fs';
import {config} from 'dotenv';
config();


const ipfsUrl = process.env.IPFS_URL as string;

const getFile = () => {
	return fs.readFileSync('./dist/calc.txt').toString();
}

const deployFile = async () => {
	const file = getFile();

	const ipfs = create({ url: ipfsUrl });

	const res = await ipfs.add(file);
	// const res = await ipfs.add('hello world');
	console.log(`CID: ${res.cid}`)
}

deployFile().then(() => {
	process.kill(0)
}).catch((e) => {
	console.log(e);
	process.kill(127)
})

export default {}
