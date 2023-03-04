import {create} from 'ipfs-http-client';
import {config} from 'dotenv';
config();

const ipfsUrl = process.env.IPFS_URL as string;


const deployFile = async () => {
	const ipfs = create({ url: ipfsUrl });

	const {cid} = await ipfs.add('QmUwNk6ADqpyNHhc71dqWm43RDumeoGeaaMbL5mKfkRrfD') as unknown as {cid: string}
	// const res = await ipfs.add('hello world');
	console.log(`CID: ${cid}`)
}

deployFile()