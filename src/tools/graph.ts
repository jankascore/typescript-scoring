import {ethers} from 'ethers';

interface QueryReturn {
	data: {
		account: {
			repays: QueryItem[]
			borrows: QueryItem[]
			liquidations: QueryItem[]
		}
	}
}

interface QueryItem {
	amount: string;
	timestamp: string;
	asset: {symbol: string, decimals: number}
}

interface DebtAction {
	type: 'borrow' | 'repay' | 'liquidation'
	amount: number;
	timestamp: number;
}

const getData = async () => {
	const resp = await fetch("https://api.thegraph.com/subgraphs/name/messari/aave-v3-ethereum", {
		body: "{\"query\":\"query Aave {\\n\\taccount(id : \\\"0x9600a48ed0f931d0c422d574e3275a90d8b22745\\\") {\\n    repays {\\n      amount\\n      timestamp\\n      asset {\\n        symbol\\n        decimals\\n      }\\n    }\\n    borrows {\\n      amount\\n      timestamp\\n      asset {\\n        symbol\\n        decimals\\n      }\\n    }\\n    liquidations {\\n      amount\\n      timestamp\\n      asset {\\n        symbol\\n        decimals\\n      }\\n    }\\n  }\\n}\",\"operationName\":\"Aave\"}",
		method: "POST"
	}).then(r => r.json()) as QueryReturn

	return resp;
}

const formatNumber = (amount: string, decimals: number): number => {
	return Number(ethers.formatUnits(amount, decimals).toString())
}

const formatItems = (query: QueryReturn): DebtAction[] => {
	const {repays, borrows, liquidations} = query.data.account;
	const newRepays: DebtAction[] = repays.map(r => {
		return {
			amount: formatNumber(r.amount, r.asset.decimals),
			timestamp: Number(r.timestamp),
			type: 'repay'
		}
	})

	const newBorrows: DebtAction[] = borrows.map(r => {
		return {
			amount: formatNumber(r.amount, r.asset.decimals),
			timestamp: Number(r.timestamp),
			type: 'borrow'
		}
	})

	const newLiq: DebtAction[] = liquidations.map(r => {
		return {
			amount: formatNumber(r.amount, r.asset.decimals),
			timestamp: Number(r.timestamp),
			type: 'liquidation'
		}
	})

	return [...newRepays, ...newBorrows, ...newLiq].sort((a, b) => a.timestamp - b.timestamp)
}

const prepareData = async () => {
	const d = await getData();
	const actions = formatItems(d);

	console.log(actions);
}

prepareData();
