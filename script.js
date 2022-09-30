import botiq from 'botiq';

export async function run(configs, compatability){
    let tokenTracker;
    if (compatability === 'binance'){
        const connection = await botiq.binance.createConnection({
            apiKey: configs.binanceAuth.apiKey,  
            apiSecret: configs.binanceAuth.apiSecret
        });
        tokenTracker = await connection.createTracker({
            tokenSymbol: configs.tokenPool.token, 
            comparatorSymbol: configs.tokenPool.comparator
        });
    } else {
        const endpoint = await botiq.ethers.createJsonRpcEndpoint({
            accessURL: configs.jsonRpcEndpoint.url,
            rateLimitPerSecond: configs.jsonRpcEndpoint.rateLimitPerSecond
        });     

        tokenTracker = await endpoint.createTracker({
            exchange: botiq.ethers.chains.ethereum.exchanges.uniswapV2,
            tokenAddress: configs.tokenPool.token,
            comparatorAddress: configs.tokenPool.comparator,
        });
    }

    const listenKey = tokenTracker.addSwapListener({listener: botiq.util.GENERIC_LOGGING_LISTENER});
    const waitMethod = configs.order.action === 'buy' ? 'awaitPriceFall' : 'awaitPriceRise';
    await botiq.modules.awaitPriceMovement[waitMethod]({
        tracker: tokenTracker,
        triggerPriceString: configs.triggerPrice,
    });
    tokenTracker.removeListener({key: listenKey});

    let actionResult;
    if (compatability === 'binance'){
        actionResult = await connection.swap({
            tokenSymbol: tokenTracker.token.symbol, 
            comparatorSymbol: tokenTracker.comparator.symbol, 
            action: configs.order.action,
            amount: configs.order.amount,
            specifying: configs.order.specifying
        });

    } else {
        actionResult = await botiq.ethers.UniswapV2.swap({
            tracker: tokenTracker,
            privateKey: configs.privateWalletKey, 
            action: configs.order.action,
            amount: configs.order.amount,
            specifying: configs.order.specifying,
            slippagePercent: configs.order.slippage,
            gasPercentModifier: configs.order.gasPercentModifier,
        });
    }

    console.log(actionResult);
}