import botiq from 'botiq';
import fs from 'fs';

const configs = JSON.parse(fs.readFileSync('./user-config.json'));
const configTemplate = JSON.parse(fs.readFileSync('./config-template.json'));
console.log(configs);
await run(configs);

export async function run(configs){
    let tokenTracker;
    const exchangeType = configs.exchangeType;
    let binanceConnection;
    if (exchangeType === 'binance'){
        binanceConnection = await botiq.binance.createConnection({
            apiKey: configs.binanceAuth.apiKey,  
            apiSecret: configs.binanceAuth.apiSecret
        });
        tokenTracker = await binanceConnection.createTracker({
            tokenSymbol: configs.binanceTokenPool.token, 
            comparatorSymbol: configs.binanceTokenPool.comparator
        });
    } else if (exchangeType === 'evm'){
        const endpoint = await botiq.ethers.createJsonRpcEndpoint({
            accessURL: configs.jsonRpcEndpoint.url,
            rateLimitPerSecond: configs.jsonRpcEndpoint.rateLimitPerSecond
        });     

        let comparatorAddress = configs.evmTokenPool.comparator;
        const nativetokenRegex = /^[Nn][Aa][Tt][Ii][Vv][Ee]\s[Tt][Oo][Kk][Ee][Nn]$/;
        if (nativetokenRegex.test(comparatorAddress)){
            comparatorAddress = endpoint.nativeToken.address;
        }
        tokenTracker = await endpoint.createTracker({
            exchange: botiq.ethers.chains.ethereum.exchanges[configs.evmExchange],
            tokenAddress: configs.evmTokenPool.token,
            comparatorAddress,
        });
    } else {
        console.log(`Invalid exchange type "${exchangeType}"`);
        return;
    }

    const action = configs.orderAction;
    const specifying =  action === 'buy' ? 'comparator' : 'token';
    const amount = action === 'buy' ? configs.amountOfComparatorToSpend : configs.amountOfTokenToSell;

    const listenKey = tokenTracker.addSwapListener({listener: botiq.util.GENERIC_LOGGING_LISTENER});
    const waitMethod = action === 'buy' ? 'awaitPriceFall' : 'awaitPriceRise';
    await botiq.modules.awaitPriceMovement[waitMethod]({
        tracker: tokenTracker,
        triggerPriceString: configs.triggerPrice,
    });
    tokenTracker.removeListener({key: listenKey});

    
    let actionResult;
    if (configs.exchangeType === 'binance'){
        actionResult = await binanceConnection.swap({
            tokenSymbol: tokenTracker.token.symbol, 
            comparatorSymbol: tokenTracker.comparator.symbol, 
            action, amount, specifying
        });

    } else {
        actionResult = await botiq.ethers.UniswapV2.swap({
            tracker: tokenTracker,
            privateKey: configs.privateWalletKey, 
            action, amount, specifying,
            slippagePercent: configs.slippage,
            justReturnEstimatedGasFee: true
           //gasPercentModifier: configs.order.gasPercentModifier,
        });
    }

    console.log(actionResult);
}