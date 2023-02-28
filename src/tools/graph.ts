import {ethers} from 'ethers';
import fs from 'fs';
import path from 'path';
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

interface QueryReturn {
	data: {
		account: {
			repays: QueryItem[]
			borrows: QueryItem[]
			liquidations: QueryItem[]
			deposits: QueryItem[]
			withdraws: QueryItem[]
		}
	}
}

interface QueryItem {
	amount: string;
	timestamp: string;
	logIndex: number;
	asset: {symbol: string, decimals: number}
}

interface DebtAction {
	type: 'borrow' | 'repay' | 'liquidation' | 'deposit' | 'withdraw'
	amount: number;
	timestamp: number;
	logIndex: number;
}

const getData = async () => {
	const resp = await fetch("https://api.thegraph.com/subgraphs/name/messari/aave-v3-ethereum", {
		body: JSON.stringify({
			query: fs.readFileSync(path.resolve(__dirname, 'queries', 'aave_v3.graphql' )).toString(),
			operationName: 'Aave'
		}),
		method: "POST"
	}).then(r => r.json()) as QueryReturn

	return resp;
}

const formatNumber = (amount: string, decimals: number): number => {
	return Number(ethers.formatUnits(amount, decimals).toString())
}

const formatItem = (queryItem: QueryItem, type: DebtAction['type']): DebtAction => {
	return {
		amount: formatNumber(queryItem.amount, queryItem.asset.decimals),
		timestamp: Number(queryItem.timestamp),
		logIndex: queryItem.logIndex,
		type
	}
}

const formatItems = (query: QueryReturn): DebtAction[] => {
	const {repays, borrows, liquidations, deposits, withdraws} = query.data.account;
	const newRepays: DebtAction[] = repays.map(r => formatItem(r, 'repay'))
	const newBorrows: DebtAction[] = borrows.map(r => formatItem(r, 'borrow'))
	const newLiqs: DebtAction[] = liquidations.map(r => formatItem(r, 'liquidation'))
	const newDeposits: DebtAction[] = deposits.map(r => formatItem(r, 'deposit'))
	const newWithdraws: DebtAction[] = withdraws.map(r => formatItem(r, 'withdraw'))

	return [...newRepays, ...newBorrows, ...newLiqs, ...newDeposits, ...newWithdraws].sort(sortFunction)
}

const sortFunction = (a: DebtAction, b: DebtAction): number => {
	if (a.timestamp === b.timestamp) {
		return a.logIndex - b.logIndex
	} else {
		return a.timestamp - b.timestamp
	}
}

const prepareData = async () => {
	const d = await getData();
	const actions = formatItems(d);

	// fs.writeFileSync('test.json', JSON.stringify(actions, undefined, 2))

	console.log(actions.slice(0, 20));
}


prepareData();
