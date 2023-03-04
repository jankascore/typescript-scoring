import {ethers} from 'ethers';
import Obligor from './obligor';
import { migrationParams } from './migration';
import {generateQuery} from './queries/aave_v3'
import ky from 'ky';

const UPPER_CASE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

interface QueryReturn {
	data?: {
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
	amountUSD: string;
	logIndex: number;
	asset: {symbol: string, decimals: number}
}

interface DebtAction {
	type: 'borrow' | 'repay' | 'liquidation' | 'deposit' | 'withdraw'
	amount: number;
	amountUSD: number;
	timestamp: number;
	logIndex: number;
	symbol: string
}

const getData = async (address: string, timestamp: number) => {
	const resp = await ky.post("https://api.thegraph.com/subgraphs/name/messari/aave-v3-ethereum", {
		body: JSON.stringify({
			query: generateQuery(address, timestamp),
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
		amountUSD: Number(queryItem.amountUSD),
		timestamp: Number(queryItem.timestamp),
		logIndex: queryItem.logIndex,
		symbol: queryItem.asset.symbol,
		type
	}
}

const formatItems = (query: QueryReturn): DebtAction[] => {
	if (!query.data || !query.data.account) return []

	const {repays, borrows, liquidations, deposits, withdraws} = query.data.account
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

export const prepareData = async (address: string, timestamp: number) => {
	const d = await getData(address, timestamp);
	const actions = formatItems(d);

	return actions;
}

const getProtocolName = (): string => {
	// this is harcoded to be aave_v3_eth
	// as this is the only chain we cover for
	// ETH Denver hackathon.
	// This was don as we store a collection of collatera
	//and borrows per protocol / chain. 
	// In a future update, we need to have this as a field 
	// or in the DebtAction
	return 'aave_v3_eth'
}

// Note, should find way to add protocol name as field in data
// Needed later when we move to multiple chains/protocols
const calculateScore = async (address: string, timestamp: number,) => {
	const actions = await prepareData(address, timestamp)
	const ob = new Obligor(10, 10, migrationParams)

	let cnt = 0
	actions.forEach(action => {
		switch (action.type) {
			case 'borrow':
				ob.addBorrow(action.amount, action.symbol, getProtocolName())
				break
			case 'deposit':
				ob.addCollateral(action.amount,action.symbol, getProtocolName(), 0)
				break
			case 'liquidation':
				// note this logic is hard-coded around aave
				// need to add protocol as field in data
				// to make dynamic
				let liqSymbol = action.symbol
				if(action.symbol[0] == "a") {
					let startix = 1
					let endix = 2
					while (endix < liqSymbol.length && !(UPPER_CASE_LETTERS.includes(liqSymbol.slice(endix-1, endix)))) {
							endix +=1
					}
					liqSymbol = liqSymbol.slice(startix, endix)
					liqSymbol = liqSymbol.toUpperCase()
				}
				ob.addLiquidation(action.amount, liqSymbol, getProtocolName(), 0);
				break
			case 'repay':
				ob.addRepay(action.amount, action.symbol, getProtocolName(), 0)
				break
			case 'withdraw':
				ob.withdrawCollateral(action.amount,action.symbol,getProtocolName(), 0)
				break
		}
		
		cnt += 1
	})

	return [ob.getScore(), ob.getConfInterval()] as const;
}

export {calculateScore}
