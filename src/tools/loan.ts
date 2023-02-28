type LoanStatus = "outstanding" | "defaulted" | "repaid";

class Loan {
	outstandingAmount: number
	constructor(
		public amount: number,
		public tenor: number,
		public collaterAmt: number,
		public protocolName: string,
		public status: LoanStatus = "outstanding"
	) {
		this.outstandingAmount = amount
	}

	ltv(price: number) {
		if (this.collaterAmt > 0)
			return this.outstandingAmount / (this.collaterAmt * price)
		else
			return Infinity
	}
}

export {Loan}