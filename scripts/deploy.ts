import {create} from 'ipfs-http-client';
import fs from 'fs';
import {config} from 'dotenv';
import {JankaProtocol} from '../../contracts/typechain-types/contracts/JankaProtocol'
import jankaJson from '../../contracts/artifacts/contracts/JankaProtocol.sol/JankaProtocol.json' assert {type: "json"}
import {Contract, ethers} from 'ethers';
config();

const address = "0x6833A38f5E2fF3E2e23Da5337Bb696d5b738495F"
const provider = new ethers.AlchemyProvider('goerli', process.env.ALCHEMY_KEY!)
const wallet = ethers.Wallet.fromPhrase(process.env.MNEMONIC!, provider)
const janka = new ethers.Contract(address, jankaJson.abi, wallet) as JankaProtocol & Contract

const ipfsUrl = process.env.IPFS_URL as string;

const getFile = () => {
	return fs.readFileSync('./dist/calc.txt').toString();
}

const deployFile = async () => {
	const file = getFile();

	const ipfs = create({ url: ipfsUrl });

	const {cid} = await ipfs.add(file) as unknown as {cid: string}
	// const res = await ipfs.add('hello world');
	console.log(`CID: ${cid}`)

	const resp = await janka.allowAlgorithmCID(cid.toString())
	await resp.wait()
		.then(() => console.log("Contract Updated"))
		.catch((e) => console.log("Failed to update contract!" + e))
}

deployFile().then(() => {
	process.kill(0)
}).catch((e) => {
	console.log(e);
	process.kill(127)
})

export default {}
