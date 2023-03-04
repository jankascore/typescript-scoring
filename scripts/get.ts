import {create} from 'ipfs-http-client';
import {config} from 'dotenv';
import * as IPFS from 'ipfs-core';
config();

const publicNode = 'https://ipfs.io';

const helloCid = 'Qmf412jQZiuVUtdgnB36FXFX7xg5V6KEbSJ4dpQuhkLyfD';
const myCid = 'QmUVGkjR7neroxpU9fwzx65km16SEpz8tj6fVdkEzHzPXN'

const get = async (cid: string) => {
	const ipfs = await IPFS.create({silent: true})
	console.log('getting...');
	const resp = ipfs.get(helloCid);
	for await (const r of resp) {
		console.log(Buffer.from(r).toString());
	}
}

get(myCid)