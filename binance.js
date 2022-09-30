import botiq from 'botiq';

export async function run(configs){

    const connection = botiq.binance.createConnection({
        apiKey: configs.binanceAuth.apiKey,  
        apiSecret: configs.binanceAuth.apiSecret
    });
    
    const tokenTracker = await connection.createTracker({
        tokenSymbol: configs.tokenPool.token, 
        comparatorSymbol: configs.tokenPool.comparator
    });

    const listenKey = tokenTracker.addSwapListener({listener: botiq.util.GENERIC_LOGGING_LISTENER});
    const waitMethod = configs.order.action === 'buy' ? 'awaitPriceFall' : 'awaitPriceRise';
    await botiq.modules.awaitPriceMovement[waitMethod]({
        tracker: tokenTracker,
        triggerPriceString: configs.triggerPrice,
    });
    tokenTracker.removeListener({key: listenKey});

    const actionResult = await connection.swap({
        tokenSymbol: tokenTracker.token.symbol, 
        comparatorSymbol: tokenTracker.comparator.symbol, 
        action: configs.order.action,
        amount: configs.order.amount,
        specifying: configs.order.specifying
    });

    console.log(actionResult);
}