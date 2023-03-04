type LoanStatus = "outstanding" | "defaulted" | "repaid";
interface StringNumberDict {[key: string]:number}

class Loan {
	outstandingAmounts: StringNumberDict
	collateralAmounts: StringNumberDict
	constructor(
		public amounts: number[],
		public borrowNames: string[],
		public collaterAmts: number[],
		public collaterNames: string[],
		public protocolName: string,
		public status: LoanStatus = "outstanding"
	) {
		this.outstandingAmounts = {}
		for (let index = 0; index < amounts.length; index++) {
			const amount = amounts[index];
			const borrowName = borrowNames[index];
			this.outstandingAmounts[borrowName] = amount;
		}

		this.collateralAmounts = {}
		for (let index = 0; index < collaterNames.length; index++) {
			const amount = collaterAmts[index];
			const collatName = collaterNames[index];

			this.collateralAmounts[collatName] = amount;
		}
	}

	get totalOutstandingAmount() {
		const nums = Object.entries(this.outstandingAmounts).map(([key, val]) => val)
		let sum = 0;
		nums.forEach(n => sum += n);
		return sum
	}

	getCollatAmt(collatName: string): number {
		if(Object.keys(this.collateralAmounts).includes(collatName)) {
			return this.collateralAmounts[collatName];
		}
		return 0
	}

	addOutstandingAmount(amt: number, name: string) {
		if(Object.keys(this.outstandingAmounts).includes(name)) {
			this.outstandingAmounts[name] += amt
		} else{
			this.outstandingAmounts[name] = amt
		}
	}
	addCollateralAmount(amt: number, name: string) {
		if(Object.keys(this.collateralAmounts).includes(name)) {
			this.collateralAmounts[name] += amt
		} else{
			this.collateralAmounts[name] = amt
		}
	}
	
}

export {Loan}