import {ethers} from 'ethers';
import Obligor from './obligor';
import { migrationParams } from './migration';
import {query} from './queries/aave_v3'
import ky from 'ky';


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
	symbol: string
}

const getData = async () => {
	const resp = await ky.post("https://api.thegraph.com/subgraphs/name/messari/aave-v3-ethereum", {
		body: JSON.stringify({
			query,
			operationName: 'Aave'
		}),
		method: "POST"
	}).json<QueryReturn>();

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
		symbol: queryItem.asset.symbol,
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

	return actions;
}

const getProtocolName = (action: DebtAction): string => {
	return 'eth_' + action.symbol;
}

const calculateScore = async () => {
	const actions = await prepareData()
	const ob = new Obligor(10, 10, migrationParams)

	actions.forEach(action => {
		switch (action.type) {
			case 'borrow':
				ob.addBorrow(action.amount, 0, 0, getProtocolName(action))
				break
			case 'deposit':
				ob.addCollateral(action.amount, 1, getProtocolName(action), 0)
				break
			case 'liquidation':
				ob.addLiquidation(action.amount, 0, getProtocolName(action), 0);
				break
			case 'repay':
				ob.addRepay(action.amount, 0, getProtocolName(action), 0)
				break
			case 'withdraw':
				ob.withdrawCollateral(action.amount, getProtocolName(action), 0)
				break
		}
	})

	return [ob.getScore(), ob.getConfInterval()];
}

export {calculateScore}
