export const generateQuery = (address: string, timestamp: number) => {
  let q = query.replaceAll('PARAM_ADDRESS', address);
  q = q.replaceAll('PARAM_TIMESTAMP', timestamp.toString());
  console.log(q);
  return q
}

const query = `query Aave {
  account(id : "PARAM_ADDRESS") {
    repays(where: {timestamp_lt: "PARAM_TIMESTAMP"}) {
      amount
      amountUSD
      timestamp
      logIndex
      asset {
        symbol
        decimals
      }
    }
    borrows(where: {timestamp_lt: "PARAM_TIMESTAMP"}) {
      amount
      amountUSD
      timestamp
      logIndex
      asset {
        symbol
        decimals
      }
    }
    liquidations(where: {timestamp_lt: "PARAM_TIMESTAMP"}) {
      amount
      amountUSD
      timestamp
      logIndex
      asset {
        symbol
        decimals
      }
    }
    deposits(where: {timestamp_lt: "PARAM_TIMESTAMP"}) {
      amount
      amountUSD
      timestamp
      logIndex
      asset {
        symbol
        decimals
      }
    }
    withdraws(where: {timestamp_lt: "PARAM_TIMESTAMP"}) {
      amount
      amountUSD
      timestamp
      logIndex
      asset {
        symbol
        decimals
      }
    }
  }
}`