import { Loan } from "./loan";
import { MigrationParams } from "./migration";

interface Loans {
	[loanId: string]: Loan
}

interface LoanCount {
	[protocol: string]: number;
}

const {log} = Math;

class Obligor {
	c0: number
	xi0: number
	c1: number
	xi1: number
	c2: number
	xi2: number
	cap: number

	outstandingLoans: Loans;
	settledLoans: Loans;
	loansPerProtocol: LoanCount;
	
	constructor(
		public alpha: number,
		public beta: number,
		public migrationParams: MigrationParams
	) {
		this.c0 = migrationParams.c0
		this.xi0 = migrationParams.xi0
		this.c1 = migrationParams.c1
		this.xi1 = migrationParams.xi1
		this.c2 = migrationParams.c2
		this.xi2 = migrationParams.xi2
		this.cap = migrationParams.cap

		this.outstandingLoans = {}
		this.settledLoans = {}
		this.loansPerProtocol = {}
	}

	get _sum_ab() {
		return this.alpha + this.beta
	}

	_stickiness() {
		// caps sum of a+b
		const diff = this._sum_ab - this.cap
		if (diff > 0) {
			this.alpha = Math.max(this.alpha - 0.5*diff, 0)
			this.beta = Math.max(this.beta - 0.5*diff, 0)

			// if alpha or beta hit 0, could still exceed cap
			// make sure alpha or beta doesn't exceed cap
			this.alpha = Math.min(this.alpha, this.cap)
			this.beta = Math.min(this.beta, this.cap)
		}
	}

	_inc_origination() {
		this.beta = (this.beta + this.c0 * log(1 + this.xi0 / this._sum_ab))
		this._stickiness()  // caps sum a + b
	}

	_inc_repay() {
		this.alpha = (this.alpha + this.c1 * log(1 + this.xi1 / this._sum_ab))
		this._stickiness()  // caps sum a + b
	}

	_inc_liquidation() {
		this.beta = (this.beta + this.c2 * log(1 + this.xi2 / this._sum_ab))
		this._stickiness()  // caps sum a + b
	}

	_addLoan(
		amount: number,
		borrowName: string,
		protocolName: string,
		loanNum: number = 0
	) {
		//fetch loan, if protocol doesn't
		//exist fetch function will store
		//loan object for you then return
		const loan = this._fetchLoan(protocolName, loanNum)

		loan.addOutstandingAmount(amount, borrowName)
		loan.status = "outstanding"
		
		this._inc_origination();

		return loanNum
	}

	_computeScore(proba : number) {
		return Math.round(100*proba)
	}

	_getLoanId(protocolName: string, loanNum: number) {
		return `loan_${protocolName}_${loanNum}`
	}

	_fetchLoan(protocolName: string, loanNum: number): Loan {
		const loanId = this._getLoanId(protocolName, loanNum);
		if (!(Object.keys(this.outstandingLoans).includes(loanId))) {
			// if doesn't exist creat empty loan obj
			this.outstandingLoans[loanId] = new Loan(
				[],[],[],[],protocolName)
		}
		return this.outstandingLoans[loanId]
	}

	// remove...
	_popLoan(protocolName: string, loanNum: number) {
		const loanId = this._getLoanId(protocolName, loanNum)
		if (Object.keys(this.outstandingLoans).includes(loanId)) {
			const loan = this.outstandingLoans[loanId]
			delete this.outstandingLoans[loanId]
			return [loan, loanId] as const
		}
		return [undefined, undefined] as const
	}

	_settleLoan(
		protocolName: string,
		loanNum: number
	): boolean {
		let loan = this._fetchLoan(protocolName, loanNum)

		if (!loan) return false;

		if (loan.totalOutstandingAmount <= 0) {
			loan.status = "repaid"
			return true
		} else {
			loan.status = "outstanding"
			return false
		}
	}

	addBorrow(amount: number, borrowName: string, protocolName: string): void {
		this._addLoan(amount, borrowName, protocolName)
	}

	addRepay(amount: number, borrow_name: string, protocolName: string, loanNum: number) {
		const loan = this._fetchLoan(protocolName, loanNum)

		console.log(loan.status, borrow_name)
		if (loan.status == 'outstanding') {
			const origAmount = loan.outstandingAmounts[borrow_name]
			const amountRemaining = loan.outstandingAmounts[borrow_name] - amount
			loan.outstandingAmounts[borrow_name] = amountRemaining

			if (amountRemaining < 0.5 * origAmount) {
				this._inc_repay();
			}
			if (amountRemaining <= 0) {
					this._settleLoan(protocolName, loanNum)
			}

			return true
		}
		return false
	}

	addLiquidation(
		amountLiquidated: number,
		collatName: string,
		protocolName: string,
		loanNum: number
	) {
		let loan = this._fetchLoan(protocolName, loanNum)
		
		if(protocolName.includes('aave')) {

			for (var key in loan.collateralAmounts) {

				if(key.includes(collatName)) {
					loan.collateralAmounts[key] -= amountLiquidated;
					this._inc_liquidation()
					return;
				}
				
			}
		} else {
			// note, we need price of collat relative
			// to borrow asset(s) to adjust fully
			loan.collateralAmounts[collatName] -= amountLiquidated
			this._inc_liquidation()
			return;
		}

	}

	withdrawCollateral(
		withdrawAmt: number,
		collatName: string,
		protocolName: string,
		loanNum: number
	) {
		const loan = this._fetchLoan(protocolName, loanNum)
		if (!loan) throw new Error("Loan not found!");

		loan.collateralAmounts[collatName] = Math.max(0, loan.collateralAmounts[collatName] - withdrawAmt)
	}

	addCollateral(
		addAmt: number,
		collatName: string,
		protocolName: string,
		loanNum: number,
	) {
		const loan = this._fetchLoan(protocolName, loanNum)
		const origCollatAmt = loan.getCollatAmt(collatName)
		loan.addCollateralAmount(addAmt, collatName)

		if ((addAmt > 0.5*origCollatAmt) && (loan.totalOutstandingAmount > 0)) {
			this._inc_repay()
		}
	}

	get proba() {
		return this.alpha / (this.alpha + this.beta)
	}
	get variance() {
		return (this.alpha*this.beta) / (Math.pow(this.alpha + this.beta, 2)*(this.alpha+this.beta+1))
	}

 	getScore() {
		return this._computeScore(this.proba)
	}

	getConfInterval(z : number = 2) {
		// get variance
		const stdev = Math.sqrt(this.variance)

		// get bounds
		const lowerBound = Math.max(this.proba - z * stdev,0)
		const upperBound = Math.min(this.proba + z * stdev,1)

		// get score
		const lowerScore = this._computeScore(lowerBound)
		const upperScore = this._computeScore(upperBound)

		// return 'list' (lower, upper)
		return [lowerScore, upperScore] as const
	}
}

export default Obligor