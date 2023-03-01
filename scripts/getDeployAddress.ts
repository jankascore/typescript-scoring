import {ethers} from 'ethers';
import fs from 'fs';

const getAddress = () => {
	const mne = fs.readFileSync('.mnemonic').toString();
	const wallet = ethers.Wallet.fromPhrase(mne);
	console.log(wallet.address)
}

getAddress()