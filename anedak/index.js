const axios = require("axios");
const Pact = require("pact-lang-api");
const { toUSDTBalances } = require("../helper/balances");

const chainId = "3";
const network = `https://api.chainweb.com/chainweb/0.0/mainnet01/chain/${chainId}/pact`;
const GAS_PRICE = 0.00000001;
const creationTime = () => Math.round(new Date().getTime() / 1000) - 10;

const getReserve = (tokenData) => {
  return parseFloat(tokenData.decimal ? tokenData.decimal : tokenData);
};

const pairTokens = {
  "coin:free.anedak": {
    name: "coin:free.anedak",
    token0: {
      name: "KDA",
      code: "coin",
    },
    token1: {
      name: "ADK",
      code: "free.anedak",
    },
  },
  "coin:free.babena": {
    name: "coin:free.babena",
    token0: {
      name: "KDA",
      code: "coin",
    },
    token1: {
      name: "BABE",
      code: "free.babena",
    },
  },
  "coin:runonflux.flux": {
    name: "coin:runonflux.flux",
    token0: {
      name: "KDA",
      code: "coin",
    },
    token1: {
      name: "FLUX",
      code: "runonflux.flux",
    },
  },
  "coin:kdlaunch.token": {
    name: "coin:kdlaunch.token",
    token0: {
      name: "KDA",
      code: "coin",
    },
    token1: {
      name: "KDL",
      code: "kdlaunch.token",
    },
  },
};

const getPairList = async () => {
  const pairList = await Promise.all(
    Object.values(pairTokens).map(async (pair) => {
      let data = await Pact.fetch.local(
        {
          pactCode: `
            (use free.exchange)
            (let*
              (
                (p (get-pair ${pair.token0.code} ${pair.token1.code}))
                (reserveA (reserve-for p ${pair.token0.code}))
                (reserveB (reserve-for p ${pair.token1.code}))
                (totalBal (free.tokens.total-supply (free.exchange.get-pair-key ${pair.token0.code} ${pair.token1.code})))
              )[totalBal reserveA reserveB])
             `,
          meta: Pact.lang.mkMeta(
            "",
            chainId,
            GAS_PRICE,
            3000,
            creationTime(),
            600
          ),
        },
        network
      );

      return {
        reserves: [
          getReserve(data.result.data[1]),
          getReserve(data.result.data[2]),
        ],
      };
    })
  );
  return pairList;
};

const fetchKdaPrice = async () => {
  const res = await axios.get(
    "https://api.coingecko.com/api/v3/simple/price?ids=kadena&vs_currencies=usd"
  );

  return res.data.kadena.usd;
};

const fetchKdaTotal = async (pairList) => {
  let kdaTotal = 0;
  for (let i = 0; i < pairList.length; i++) {
    let pair = pairList[i];
    kdaTotal += pair.reserves[0];
  }
  return kdaTotal;
};

async function fetch() {
  const pairList = await getPairList();
  const kdaPrice = await fetchKdaPrice();
  const kdaTotal = await fetchKdaTotal(pairList);
  const kdaInAnedakPair = pairList[0].reserves[0];
  const kdaInBabenaPair = pairList[1].reserves[0];
  const kdaInFluxPair = pairList[2].reserves[0];
  const kdaInKdlPair = pairList[3].reserves[0];

  const tvl =
    kdaPrice *
    (kdaTotal +
      kdaInAnedakPair +
      kdaInBabenaPair +
      kdaInFluxPair +
      kdaInKdlPair);

  return toUSDTBalances(tvl);
}

module.exports = {
  misrepresentedTokens: true,
  kadena: {
    tvl: fetch,
  },
};
