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
	c3: number
	xi3: number

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
		this.c3 = migrationParams.c3
		this.xi3 = migrationParams.xi3

		this.outstandingLoans = {}
		this.settledLoans = {}
		this.loansPerProtocol = {}
	}

	get _sum_ab() {
		return this.alpha + this.beta
	}

	get _stickiness() {
		return Math.min(1, this.c3 * log(1 + this.xi3 / this._sum_ab))
	}

	_inc_origination() {
		this.beta = (this.beta + this.c0 * log(1 + this.xi0 / this._sum_ab)) * this._stickiness
	}

	_inc_repay() {
		this.alpha = (this.alpha + this.c1 * log(1 + this.xi1 / this._sum_ab)) * this._stickiness
	}

	_inc_liquidation() {
		this.beta = (this.beta + this.c2 * log(1 + this.xi2 / this._sum_ab)) * this._stickiness
	}

	_addLoan(
		amount: number,
		tenor: number,
		collateralAmt: number,
		protocolName: string
	) {
		// Add loan to borrower's collection
		const loanNum = this.loansPerProtocol[protocolName] || 0
		this.loansPerProtocol[protocolName] = loanNum + 1;

		if (tenor > 0) {
			const loanId = `loan_${protocolName}_${loanNum}`

			this.outstandingLoans[loanId] = new Loan(
				amount, tenor, collateralAmt, protocolName
			)
		} else {
			const loanId = `loan_${protocolName}_${loanNum}`
			const newLoan = this.outstandingLoans[loanId] || new Loan(
				0, tenor, 0, protocolName
			)

			newLoan.amount += amount
			newLoan.outstandingAmount += amount
			newLoan.collaterAmt += collateralAmt

			this.outstandingLoans[loanId] = newLoan
		}
		this._inc_origination();

		return loanNum
	}

	_computeScore(proba : number) {
		return Math.round(100*proba)
	}

	_getLoanId(protocolName: string, loanNum: number) {
		return `loan_${protocolName}_${loanNum}`
	}

	_fetchLoan(protocolName: string, loanNum: number): Loan | undefined {
		const loanId = this._getLoanId(protocolName, loanNum);
		return this.outstandingLoans[loanId]
	}

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
		repaymentTime: number,
		protocolName: string,
		loanNum: number
	) {
		const [loan, loanId] = this._popLoan(protocolName, loanNum)

		if (!loan) return false;

		if (loan.status === 'outstanding' && loan.tenor >= repaymentTime) {
			loan.status = 'repaid'
		} else if (loan.status === 'outstanding' && loan.tenor < repaymentTime) {
			loan.status = 'defaulted'
		} else {
			return false;
		}

		this.settledLoans[loanId] = loan;
	}

	addBorrow(amount: number, tenor: number, collateralAmt: number, protocolName: string) {
		this._addLoan(amount, tenor, collateralAmt, protocolName)
	}

	addRepay(amount: number, repaymentTime: number, protocolName: string, loanNum: number) {
		const loan = this._fetchLoan(protocolName, loanNum)

		if (!loan) return false

		if (loan.status === 'outstanding') {
			const {outstandingAmount} = loan
			const amountRemaining = outstandingAmount - amount
			loan.outstandingAmount = amountRemaining

			if (loan.tenor === 0) {
				if (amountRemaining < 0.5 * loan.outstandingAmount) {
					this._inc_repay();
					loan.amount = amountRemaining
				}

				if (amountRemaining <= 0) {
					this._settleLoan(repaymentTime, protocolName, loanNum)
				}
			} else {
				if (amountRemaining <= 0) {
					this._inc_repay()
					this._settleLoan(repaymentTime, protocolName, loanNum)
				}
			}

			return true
		}
		return false
	}

	addLiquidation(
		amountLiquidated: number,
		repaymentTime: number,
		protocolName: string,
		loanNum: number
	) {
		const loan = this._fetchLoan(protocolName, loanNum)
		if(!loan) throw new Error("Loan does not exist!");

		const remCollat = loan.collaterAmt - amountLiquidated
		const newOutstanding = loan.outstandingAmount - amountLiquidated
		loan.outstandingAmount = newOutstanding
		loan.collaterAmt = remCollat

		this._inc_liquidation()
		
		if (newOutstanding <= 0) {
			this._settleLoan(repaymentTime, protocolName, loanNum)
		}
	}

	withdrawCollateral(
		withdrawAmt: number,
		protocolName: string,
		loanNum: number
	) {
		const loan = this._fetchLoan(protocolName, loanNum)
		if (!loan) throw new Error("Loan not found!");

		loan.collaterAmt = Math.max(0, loan.collaterAmt - withdrawAmt)
	}

	addCollateral(
		addAmt: number,
		price: number,
		protocolName: string,
		loanNum: number,
	) {
		let loan = this._fetchLoan(protocolName, loanNum)
		if (!loan) {
			const loanNum = this._addLoan(0, 0, addAmt, protocolName)
			loan = this._fetchLoan(protocolName, loanNum)!
		}

		const original_collat = loan.collaterAmt
		const new_collat_amt = loan.collaterAmt + addAmt

		if ((new_collat_amt - original_collat)*price > 0.5*loan.outstandingAmount) {
			this._inc_repay
		}
		loan.collaterAmt = new_collat_amt
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