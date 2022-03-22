const { SwapCanisterController } = require("@psychedelic/sonic-js");

const retry = require("async-retry");
const axios = require("axios");
const { toUSDTBalances } = require("../helper/balances");

const anonymousController = new SwapCanisterController();

const fetchIcpPrice = async () => {
  const res = await axios.get(
    "https://api.coingecko.com/api/v3/simple/price?ids=internet-computer&vs_currencies=usd"
  );
  return res.data["internet-computer"].usd;
};

const fetch = async () => {
  const pool = await anonymousController.getPairList();
  let {
    ["aanaa-xaaaa-aaaah-aaeiq-cai"]: {
      ["utozz-siaaa-aaaam-qaaxq-cai"]: {
        ["reserve0"]: bigIntReserve0,
        ["reserve1"]: bigIntReserve1,
      },
    },
  } = pool;

  const reserve0 = Number(bigIntReserve0) / 10 ** 12; // XTC token: 12 decimals
  const reserve1 = Number(bigIntReserve1) / 10 ** 8; // wrappedICP token: 8 decimals

  const icpPrice = await fetchIcpPrice();

  const xtcWicpPoolValue = 2 * reserve1 * icpPrice; // XTC not yet on other DEXes, so value of pool taken to be twice ICP value

  const tvl = xtcWicpPoolValue;

  return toUSDTBalances(tvl);
};

module.exports = {
  misrepresentedTokens: true,
  timeTravel: false,
  methodology: "",
  "Internet Computer": {
    tvl: fetch,
  },
};
