import fs from 'fs';
import { calculateScore, prepareData } from '../src/tools/graph';

// first test
// export const address = "0x9600a48ed0f931d0c422d574e3275a90d8b22745"

// second test
// export const address = "0xe6c2ebad69b325be894f768972dc8f896994e6ce"

// with liqs
export const address = "0x2068d14ee50772dd6e89c6f64f32adad0cc936ef"

const getData = async () => {
	const timestamp = Math.floor(new Date().getTime()/1000);
	const data = await prepareData(address, timestamp)
	const [score, range] = await calculateScore(address, timestamp);

	fs.writeFileSync(`testData/${address.slice(0, 6)}-${score}-${range[0]}-${range[1]}.json`, JSON.stringify(data, undefined, 2))
	// fs.writeFileSync(`testData/${address.slice(0, 6)}.json`, JSON.stringify(data, undefined, 2))
}

getData();
