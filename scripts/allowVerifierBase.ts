import fs from 'fs';
import {config} from 'dotenv';
import {JankaProtocol} from '../../contracts/typechain-types/contracts/JankaProtocol'
import jankaJson from '../../contracts/artifacts/contracts/JankaProtocol.sol/JankaProtocol.json' assert {type: "json"}
import {Contract, ethers} from 'ethers';
config();

const address = "0x586981dEB8995848C003Bca567207052A3314a14"
const provider = new ethers.JsonRpcProvider('https://goerli.base.org')
const wallet = new ethers.Wallet(process.env.BASE_KEY!, provider)
const janka = new ethers.Contract(address, jankaJson.abi, wallet) as JankaProtocol & Contract

const verifier = '0x08473D1a61952fff21d09a6bEc4886cf0842b62D';

const setVerifier = async (address: string) => {
	console.log("Setting Verifier...");
	try {
		const tx = await janka.allowVerifier(address);
		const resp = await tx.wait();
	} catch (e) {
		console.log(JSON.stringify(e, undefined, 2))
	}
}

setVerifier(verifier);