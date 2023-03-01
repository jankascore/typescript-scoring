import {ethers} from 'ethers';
import {config} from 'dotenv';
import fs from 'fs';

const getPriv = () => {
	const wallet = ethers.Wallet.fromPhrase(process.env.MNEMONIC!)
	fs.writeFileSync('privkey', wallet.privateKey);
}

getPriv()