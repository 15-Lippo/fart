export async function getTopCryptos() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=500&page=1&sparkline=false');
        const cryptos = await response.json();
        return cryptos
            .filter(crypto => crypto.market_cap > 50_000_000) 
            .map(crypto => ({
                name: crypto.name,
                symbol: crypto.symbol.toUpperCase(),
                currentPrice: crypto.current_price,
                marketCap: crypto.market_cap,
                priceChangePercentage24h: crypto.price_change_percentage_24h,
                rank: crypto.market_cap_rank
            }));
    } catch (error) {
        console.error('Error fetching top cryptocurrencies:', error);
        return [];
    }
}

export async function getCryptoSignals() {
    try {
        // Debug iniziale
        console.log('==================== INIZIO PROCESSO SEGNALI ====================');
        debugSignalsProcess('Inizio della richiesta dei segnali');
        
        // Aggiungo timeout alla richiesta fetch per evitare stalli
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 secondi di timeout
        
        console.log('Richiesta segnali in corso...');
        let response;
        try {
            debugSignalsProcess('Avvio fetch API');
            response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false', {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            debugSignalsProcess(`Risposta API ricevuta: status ${response.status}`);
        } catch (fetchError) {
            debugSignalsProcess(`Errore durante il fetch: ${fetchError.message}`);
            console.warn(`Errore fetch API: ${fetchError.message}`);
            clearTimeout(timeoutId);
            return getHardcodedSignals(); // Ritorna segnali predefiniti in caso di errore API
        }
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            debugSignalsProcess(`Risposta API non valida: ${response.status} - ${response.statusText}`);
            console.warn(`Errore API segnali: ${response.status} - ${response.statusText}`);
            return getHardcodedSignals(); // Ritorna segnali predefiniti in caso di errore API
        }
        
        let cryptos;
        try {
            debugSignalsProcess('Parsing JSON');
            cryptos = await response.json();
            debugSignalsProcess(`Ricevute ${cryptos ? cryptos.length : 0} criptovalute dall'API`);
        } catch (parseError) {
            debugSignalsProcess(`Errore parsing JSON: ${parseError.message}`);
            console.error('Errore nel parsing della risposta JSON:', parseError);
            return getHardcodedSignals();
        }
        
        console.log(`Ricevute ${cryptos.length} criptovalute dall'API`);
        
        if (!cryptos || !Array.isArray(cryptos) || cryptos.length === 0) {
            debugSignalsProcess('Risposta API non valida o vuota');
            console.warn("Risposta API non valida o vuota");
            return getHardcodedSignals();
        }
        
        const signals = [];
        let errorCount = 0;
        
        // Utilizziamo il vecchio metodo come fallback se non ci sono segnali con il nuovo
        const fallbackSignals = [];
        
        // Limitiamo il numero di criptovalute da analizzare per migliorare le prestazioni
        const cryptosToAnalyze = cryptos.filter(c => c.market_cap > 5_000_000).slice(0, 50);
        debugSignalsProcess(`Analisi di ${cryptosToAnalyze.length} criptovalute...`);
        console.log(`Analisi di ${cryptosToAnalyze.length} criptovalute...`);
        
        let analyzeIndex = 0;
        for (const crypto of cryptosToAnalyze) {
            analyzeIndex++;
            try {
                debugSignalsProcess(`Analisi ${analyzeIndex}/${cryptosToAnalyze.length}: ${crypto.symbol}`);
                
                // Calcola segnali con il metodo semplice come fallback
                const { signalType, confidence } = enhancedSignalAnalysis(crypto);
                const entryPrice = crypto.current_price;
                const targetPrice = calculateTargetPrice(crypto, signalType);
                const stopLoss = calculateStopLoss(crypto, signalType);
                const { support, resistance } = calculateSupportResistance(crypto);
                
                // Salva il segnale semplice come fallback
                if (signalType !== 'NEUTRAL' && Math.abs((targetPrice - entryPrice) / entryPrice * 100) > 3) {
                    debugSignalsProcess(`Generato segnale fallback per ${crypto.symbol}: ${signalType}`);
                    fallbackSignals.push({
                        id: crypto.id,
                        pair: `${crypto.symbol.toUpperCase()}/USDT`,
                        name: crypto.name,
                        signalType,
                        entryPrice: entryPrice.toFixed(4),
                        targetPrice: targetPrice.toFixed(4),
                        stopLoss: stopLoss.toFixed(4),
                        support: support.map(s => s.toFixed(4)),
                        resistance: resistance.map(r => r.toFixed(4)),
                        potentialGain: ((targetPrice - entryPrice) / entryPrice * 100).toFixed(2),
                        riskReward: calculateRiskReward(entryPrice, targetPrice, stopLoss),
                        confidence: confidence,
                        priceChange24h: crypto.price_change_percentage_24h.toFixed(2),
                        indicators: {
                            rsi: 50,
                            macd: "0",
                            trendStrength: "0",
                            patternDetected: "NESSUNO"
                        }
                    });
                }
                
                // Prova ad applicare analisi avanzata solo se non abbiamo abbastanza segnali fallback
                // e solo per le prime 15 criptovalute per ottimizzare le prestazioni
                if (fallbackSignals.length < 10 && cryptosToAnalyze.indexOf(crypto) < 15) {
                    try {
                        debugSignalsProcess(`Tentativo analisi avanzata per ${crypto.symbol}`);
                        // Ottieni dati storici per analisi avanzata con timeout
                        const historicalDataController = new AbortController();
                        const historicalTimeoutId = setTimeout(() => historicalDataController.abort(), 5000);
                        
                        const historicalData = await getCryptoFullHistoricalData(crypto.id, 30, historicalDataController.signal);
                        clearTimeout(historicalTimeoutId);
                        
                        if (!historicalData) {
                            debugSignalsProcess(`Dati storici non disponibili per ${crypto.symbol}`);
                            continue;
                        }
                        
                        // Esegui analisi avanzata per determinare il segnale
                        const analysis = advancedTechnicalAnalysis(crypto, historicalData);
                        
                        // Verifica se il segnale è abbastanza forte per essere considerato
                        // Ridotto a 50 per garantire più segnali
                        if (analysis.signalStrength < 50) {
                            debugSignalsProcess(`Segnale troppo debole per ${crypto.symbol}: ${analysis.signalStrength}`);
                            continue;
                        }
                        
                        // Calcola livelli di ingresso, target e stop loss
                        const preciseTargetPrice = calculatePreciseTargetPrice(crypto, analysis);
                        const preciseStopLoss = calculatePreciseStopLoss(crypto, analysis);
                        
                        // Calcola supporti e resistenze avanzati
                        const advancedLevels = calculateAdvancedSupportResistance(crypto, historicalData);
                        
                        debugSignalsProcess(`Generato segnale avanzato per ${crypto.symbol}: ${analysis.signalType}`);
                        signals.push({
                            id: crypto.id,
                            pair: `${crypto.symbol.toUpperCase()}/USDT`,
                            name: crypto.name,
                            signalType: analysis.signalType,
                            entryPrice: entryPrice.toFixed(4),
                            targetPrice: preciseTargetPrice.toFixed(4),
                            stopLoss: preciseStopLoss.toFixed(4),
                            support: advancedLevels.support.map(s => s.toFixed(4)),
                            resistance: advancedLevels.resistance.map(r => r.toFixed(4)),
                            potentialGain: ((preciseTargetPrice - entryPrice) / entryPrice * 100).toFixed(2),
                            riskReward: calculateRiskReward(entryPrice, preciseTargetPrice, preciseStopLoss),
                            confidence: analysis.signalStrength,
                            priceChange24h: crypto.price_change_percentage_24h.toFixed(2),
                            indicators: {
                                rsi: analysis.rsi,
                                macd: analysis.macd,
                                trendStrength: analysis.trendStrength,
                                patternDetected: analysis.patternDetected
                            }
                        });
                    } catch (analysisError) {
                        debugSignalsProcess(`Errore nell'analisi avanzata per ${crypto.symbol}: ${analysisError.message}`);
                        console.error(`Errore nell'analisi avanzata per ${crypto.symbol}:`, analysisError);
                        errorCount++;
                    }
                }
            } catch (cryptoError) {
                debugSignalsProcess(`Errore nell'elaborazione di ${crypto.symbol}: ${cryptoError.message}`);
                console.error(`Errore nell'elaborazione di ${crypto.symbol}:`, cryptoError);
                errorCount++;
            }
        }
        
        debugSignalsProcess(`Generati ${signals.length} segnali avanzati e ${fallbackSignals.length} segnali semplici con ${errorCount} errori`);
        console.log(`Generati ${signals.length} segnali avanzati e ${fallbackSignals.length} segnali semplici con ${errorCount} errori`);
        
        // Usa i fallback se non abbiamo abbastanza segnali avanzati
        let finalSignals = signals;
        if (signals.length < 5 && fallbackSignals.length > 0) {
            debugSignalsProcess(`Utilizzo di ${fallbackSignals.length} segnali di fallback`);
            console.log(`Utilizzo di ${fallbackSignals.length} segnali di fallback`);
            finalSignals = [...signals, ...fallbackSignals];
        }
        
        // Se non abbiamo nessun segnale, genera almeno alcuni segnali generici
        if (finalSignals.length === 0) {
            debugSignalsProcess(`Nessun segnale trovato, generazione di segnali generici`);
            console.log("Nessun segnale trovato, generazione di segnali generici");
            finalSignals = generateGenericSignals(cryptos);
        }
        
        const result = finalSignals
            .filter(signal => signal.signalType !== 'NEUTRAL')
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 20);
            
        debugSignalsProcess(`Restituiti ${result.length} segnali totali`);
        console.log(`Restituiti ${result.length} segnali totali`);
        
        // Se dopo tutto non abbiamo segnali, usa quelli predefiniti
        if (!result || result.length === 0) {
            debugSignalsProcess(`Nessun segnale disponibile dopo tutti i tentativi, uso segnali predefiniti`);
            console.warn("Nessun segnale disponibile dopo tutti i tentativi, uso segnali predefiniti");
            return getHardcodedSignals();
        }
        
        debugSignalsProcess('==================== FINE PROCESSO SEGNALI - OK ====================');
        return result;
    } catch (error) {
        debugSignalsProcess(`Errore generale nella generazione dei segnali: ${error.message}`);
        console.error('Errore nella generazione dei segnali crypto:', error);
        
        // Ritorna direttamente i segnali predefiniti in caso di errore
        debugSignalsProcess('==================== FINE PROCESSO SEGNALI - FALLBACK ====================');
        return getHardcodedSignals();
    }
}

// Funzione di debug per tracciare dettagliatamente il processo di recupero segnali
function debugSignalsProcess(message) {
    const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
    console.log(`[DEBUG][${timestamp}] ${message}`);
}

// Funzione per fornire segnali predefiniti
function getHardcodedSignals() {
    console.log("Restituzione dei segnali predefiniti");
    return [
        {
            id: "bitcoin",
            pair: "BTC/USDT",
            name: "Bitcoin",
            signalType: "BUY",
            entryPrice: "35000.0000",
            targetPrice: "38500.0000",
            stopLoss: "33250.0000",
            support: ["33000.0000", "30000.0000", "27000.0000"],
            resistance: ["38000.0000", "40000.0000", "45000.0000"],
            potentialGain: "10.00",
            riskReward: "1:1.50",
            confidence: 75,
            priceChange24h: "2.50",
            indicators: {
                rsi: 55,
                macd: "1.5",
                trendStrength: "2.3",
                patternDetected: "BULLISH_TREND"
            }
        },
        {
            id: "ethereum",
            pair: "ETH/USDT",
            name: "Ethereum",
            signalType: "BUY",
            entryPrice: "2400.0000",
            targetPrice: "2640.0000",
            stopLoss: "2280.0000",
            support: ["2200.0000", "2000.0000", "1800.0000"],
            resistance: ["2600.0000", "2800.0000", "3000.0000"],
            potentialGain: "10.00",
            riskReward: "1:2.00",
            confidence: 70,
            priceChange24h: "3.20",
            indicators: {
                rsi: 52,
                macd: "0.8",
                trendStrength: "1.7",
                patternDetected: "BULLISH_TREND"
            }
        },
        {
            id: "solana",
            pair: "SOL/USDT",
            name: "Solana",
            signalType: "BUY",
            entryPrice: "120.0000",
            targetPrice: "138.0000",
            stopLoss: "112.0000",
            support: ["110.0000", "100.0000", "90.0000"],
            resistance: ["140.0000", "150.0000", "160.0000"],
            potentialGain: "15.00",
            riskReward: "1:2.25",
            confidence: 65,
            priceChange24h: "4.50",
            indicators: {
                rsi: 62,
                macd: "2.1",
                trendStrength: "3.5",
                patternDetected: "BULLISH_BREAKOUT"
            }
        },
        {
            id: "binancecoin",
            pair: "BNB/USDT",
            name: "Binance Coin",
            signalType: "BUY",
            entryPrice: "320.0000",
            targetPrice: "360.0000",
            stopLoss: "300.0000",
            support: ["300.0000", "280.0000", "260.0000"],
            resistance: ["350.0000", "380.0000", "400.0000"],
            potentialGain: "12.50",
            riskReward: "1:2.00",
            confidence: 62,
            priceChange24h: "2.80",
            indicators: {
                rsi: 58,
                macd: "1.2",
                trendStrength: "2.1",
                patternDetected: "BULLISH_TREND"
            }
        },
        {
            id: "ripple",
            pair: "XRP/USDT",
            name: "XRP",
            signalType: "BUY",
            entryPrice: "0.5500",
            targetPrice: "0.6300",
            stopLoss: "0.5150",
            support: ["0.5000", "0.4800", "0.4500"],
            resistance: ["0.6000", "0.6500", "0.7000"],
            potentialGain: "14.55",
            riskReward: "1:2.29",
            confidence: 60,
            priceChange24h: "3.50",
            indicators: {
                rsi: 54,
                macd: "0.5",
                trendStrength: "1.8",
                patternDetected: "BULLISH_CONSOLIDATION"
            }
        }
    ];
}

// Funzione per generare segnali generici quando tutto fallisce
function generateGenericSignals(cryptos) {
    // Se non abbiamo nemmeno i dati delle criptovalute, usa alcuni predefiniti
    if (!cryptos || cryptos.length === 0) {
        console.log("Nessuna criptovaluta disponibile, utilizzo cripto predefinite");
        
        // Dati predefiniti per bitcoin ed ethereum
        return [
            {
                id: "bitcoin",
                pair: "BTC/USDT",
                name: "Bitcoin",
                signalType: "BUY",
                entryPrice: "35000.0000",
                targetPrice: "38500.0000",
                stopLoss: "33250.0000",
                support: ["33000.0000", "30000.0000", "27000.0000"],
                resistance: ["38000.0000", "40000.0000", "45000.0000"],
                potentialGain: "10.00",
                riskReward: "1:1.50",
                confidence: 75,
                priceChange24h: "2.50",
                indicators: {
                    rsi: 55,
                    macd: "1.5",
                    trendStrength: "2.3",
                    patternDetected: "BULLISH_TREND"
                }
            },
            {
                id: "ethereum",
                pair: "ETH/USDT",
                name: "Ethereum",
                signalType: "BUY",
                entryPrice: "2400.0000",
                targetPrice: "2640.0000",
                stopLoss: "2280.0000",
                support: ["2200.0000", "2000.0000", "1800.0000"],
                resistance: ["2600.0000", "2800.0000", "3000.0000"],
                potentialGain: "10.00",
                riskReward: "1:2.00",
                confidence: 70,
                priceChange24h: "3.20",
                indicators: {
                    rsi: 58,
                    macd: "1.2",
                    trendStrength: "1.8",
                    patternDetected: "BULLISH_ENGULFING"
                }
            }
        ];
    }
    
    // Altrimenti, genera segnali basati sui dati disponibili
    return cryptos
        .filter(crypto => crypto.market_cap > 50_000_000)
        .map(crypto => {
            const priceChange = crypto.price_change_percentage_24h || 0;
            const signalType = priceChange > 2 ? 'BUY' : priceChange < -2 ? 'SELL' : 'NEUTRAL';
            const entryPrice = crypto.current_price || 1000;
            const targetPrice = signalType === 'BUY' ? entryPrice * 1.1 : signalType === 'SELL' ? entryPrice * 0.9 : entryPrice;
            const stopLoss = signalType === 'BUY' ? entryPrice * 0.95 : signalType === 'SELL' ? entryPrice * 1.05 : entryPrice;
            
            return {
                id: crypto.id || "generic-" + crypto.symbol,
                pair: `${(crypto.symbol || "XXX").toUpperCase()}/USDT`,
                name: crypto.name || "Sconosciuto",
                signalType,
                entryPrice: entryPrice.toFixed(4),
                targetPrice: targetPrice.toFixed(4),
                stopLoss: stopLoss.toFixed(4),
                support: [
                    (entryPrice * 0.9).toFixed(4),
                    (entryPrice * 0.85).toFixed(4),
                    (entryPrice * 0.8).toFixed(4)
                ],
                resistance: [
                    (entryPrice * 1.1).toFixed(4),
                    (entryPrice * 1.15).toFixed(4),
                    (entryPrice * 1.2).toFixed(4)
                ],
                potentialGain: ((targetPrice - entryPrice) / entryPrice * 100).toFixed(2),
                riskReward: `1:${Math.abs((targetPrice - entryPrice) / (entryPrice - stopLoss)).toFixed(2)}`,
                confidence: Math.abs(priceChange) > 10 ? 85 : Math.abs(priceChange) > 5 ? 70 : 60,
                priceChange24h: priceChange.toFixed(2),
                indicators: {
                    rsi: 50,
                    macd: "0",
                    trendStrength: "0",
                    patternDetected: signalType === 'BUY' ? "BULLISH_TREND" : signalType === 'SELL' ? "BEARISH_TREND" : "NESSUNO"
                }
            };
        })
        .filter(signal => signal.signalType !== 'NEUTRAL')
        .sort((a, b) => Math.abs(parseFloat(b.potentialGain)) - Math.abs(parseFloat(a.potentialGain)))
        .slice(0, 10);
}

// Versione aggiornata per supportare il timeout
export async function getCryptoFullHistoricalData(id, days = 30, signal) {
    try {
        let apiUrl;
        try {
            // Alcuni simboli potrebbero avere nomi differenti, proviamo a normalizzare
            const normalizedId = id.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/\./g, '-');
                
            apiUrl = `https://api.coingecko.com/api/v3/coins/${normalizedId}/market_chart?vs_currency=usd&days=${days}`;
            
            // Per ID personalizzati o segnali predefiniti, usiamo bitcoin come fallback
            if (normalizedId.startsWith('generic-') || normalizedId === 'unknown') {
                apiUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`;
            }
        } catch (e) {
            apiUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`;
        }
        
        console.log(`Richiesta dati completi per ${id}...`);
        const response = await fetch(apiUrl, {
            signal,
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Errore API dati storici: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Estrai i dati necessari e gestisci casi speciali
        const prices = data.prices?.map(p => p[1]) || [];
        const volumes = data.total_volumes?.map(v => v[1]) || [];
        const marketCaps = data.market_caps?.map(m => m[1]) || [];
        
        // Se non ci sono abbastanza dati, fallisci
        if (prices.length < 20) {
            throw new Error('Dati storici insufficienti');
        }
        
        // Calcola alcuni indicatori tecnici
        const sma20 = calculateSMA(prices, 20);
        const bollinger = calculateBollingerBands(prices, 20, 2);
        
        return {
            prices,
            volumes,
            marketCaps,
            indicators: {
                sma20,
                bollinger
            }
        };
    } catch (error) {
        console.error(`Errore nel recupero dei dati storici per ${id}:`, error);
        return null;
    }
}

function calculateSMA(prices, period) {
    const sma = [];
    for (let i = period - 1; i < prices.length; i++) {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
    }
    return sma;
}

function calculateEMA(prices, period) {
    const multiplier = 2 / (period + 1);
    const ema = [prices[0]];
    
    for (let i = 1; i < prices.length; i++) {
        const emaValue = (prices[i] - ema[i-1]) * multiplier + ema[i-1];
        ema.push(emaValue);
    }
    
    return ema;
}

function calculateRSI(prices, period = 14) {
    const changes = prices.slice(1).map((price, i) => price - prices[i]);
    const gains = changes.map(change => Math.max(change, 0));
    const losses = changes.map(change => Math.abs(Math.min(change, 0)));
    
    const avgGain = calculateAverage(gains, period);
    const avgLoss = calculateAverage(losses, period);
    
    return avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));
}

function calculateAverage(values, period) {
    const sum = values.slice(0, period).reduce((a, b) => a + b, 0);
    return sum / period;
}

function calculateBollingerBands(prices, period = 20, stdDev = 2) {
    const sma = calculateSMA(prices, period);
    const standardDeviation = calculateStandardDeviation(prices, period);
    
    const upperBand = sma.map((value, index) => 
        value + (standardDeviation[index] * stdDev)
    );
    
    const lowerBand = sma.map((value, index) => 
        value - (standardDeviation[index] * stdDev)
    );
    
    return {
        middle: sma,
        upper: upperBand,
        lower: lowerBand
    };
}

function calculateStandardDeviation(prices, period) {
    const stdDev = [];
    
    for (let i = period - 1; i < prices.length; i++) {
        const periodPrices = prices.slice(i - period + 1, i + 1);
        const mean = periodPrices.reduce((a, b) => a + b, 0) / period;
        
        const variance = periodPrices.reduce((sum, price) => 
            sum + Math.pow(price - mean, 2), 0) / period;
        
        stdDev.push(Math.sqrt(variance));
    }
    
    return stdDev;
}

// Manteniamo la funzione originale per l'analisi semplice come fallback
function enhancedSignalAnalysis(crypto) {
    const { 
        price_change_percentage_24h: priceChange, 
        total_volume: volume,
        market_cap: marketCap 
    } = crypto;
    
    let signalType = 'NEUTRAL';
    let confidence = 0;
    
    const volumeIndicator = volume / marketCap;
    const volatilityFactor = Math.abs(priceChange);

    if (priceChange > 5 && volumeIndicator > 0.0005) {
        signalType = 'BUY';
        confidence = Math.min(volatilityFactor * 3, 95);
    } else if (priceChange < -5 && volumeIndicator > 0.0005) {
        signalType = 'SELL';
        confidence = Math.min(volatilityFactor * 3, 95);
    }

    return { 
        signalType, 
        confidence: Math.floor(confidence)
    };
}

function calculateTargetPrice(crypto, signalType) {
    const currentPrice = crypto.current_price;
    const volatility = Math.abs(crypto.price_change_percentage_24h);
    
    return signalType === 'BUY' 
        ? currentPrice * (1 + (0.08 + volatility/100)) 
        : signalType === 'SELL' 
            ? currentPrice * (1 - (0.08 + volatility/100)) 
            : currentPrice;
}

function calculateStopLoss(crypto, signalType) {
    const currentPrice = crypto.current_price;
    const volatility = Math.abs(crypto.price_change_percentage_24h);
    
    return signalType === 'BUY' 
        ? currentPrice * (1 - (0.05 + volatility/200)) 
        : signalType === 'SELL' 
            ? currentPrice * (1 + (0.05 + volatility/200)) 
            : currentPrice;
}

function calculateRiskReward(entry, target, stopLoss) {
    const potentialProfit = Math.abs(target - entry);
    const potentialLoss = Math.abs(entry - stopLoss);
    return potentialLoss > 0 ? `1:${(potentialProfit / potentialLoss).toFixed(2)}` : '1:1';
}

function calculateSupportResistance(crypto) {
    const currentPrice = crypto.current_price;
    const priceChange = crypto.price_change_percentage_24h;
    
    // Enhanced support/resistance calculation with more nuanced approach
    const volatilityFactor = Math.abs(priceChange) / 100;
    const supportLevels = [
        currentPrice * (1 - volatilityFactor * 0.5),  // Weak support
        currentPrice * (1 - volatilityFactor * 1),    // Medium support
        currentPrice * (1 - volatilityFactor * 1.5)   // Strong support
    ];
    
    const resistanceLevels = [
        currentPrice * (1 + volatilityFactor * 0.5),  // Weak resistance
        currentPrice * (1 + volatilityFactor * 1),    // Medium resistance
        currentPrice * (1 + volatilityFactor * 1.5)   // Strong resistance
    ];
    
    return { 
        support: supportLevels,
        resistance: resistanceLevels,
        currentPrice: currentPrice
    };
}

function advancedTechnicalAnalysis(crypto, historicalData) {
    try {
        const { prices, volumes } = historicalData;
        
        if (!prices || prices.length < 50 || !volumes || volumes.length < 50) {
            throw new Error("Dati storici insufficienti per l'analisi");
        }
        
        // Calcola gli indicatori tecnici
        const sma20 = calculateSMA(prices, 20);
        const sma50 = calculateSMA(prices, Math.min(50, prices.length - 1));
        const sma200 = prices.length >= 200 ? calculateSMA(prices, 200) : sma50;
        const ema20 = calculateEMA(prices, 20);
        const ema50 = calculateEMA(prices, Math.min(50, prices.length - 1));
        const rsi = calculateRSI(prices, 14);
        
        // Verifica che ci siano abbastanza dati per MACD
        let macd = { macdLine: [0], signalLine: [0], histogram: [0] };
        try {
            macd = calculateMACD(prices, 12, 26, 9);
        } catch (e) {
            console.warn("Impossibile calcolare MACD, uso valori predefiniti");
        }
        
        // Verifica che ci siano abbastanza dati per Bollinger Bands
        let bbandsUpper = [prices[prices.length - 1] * 1.05];
        let bbandsLower = [prices[prices.length - 1] * 0.95];
        try {
            const bbands = calculateBollingerBands(prices, 20, 2);
            bbandsUpper = bbands.upper;
            bbandsLower = bbands.lower;
        } catch (e) {
            console.warn("Impossibile calcolare Bollinger Bands, uso valori predefiniti");
        }
        
        // Analisi del volume con gestione errori
        let volumeAnalysis = 1;
        try {
            volumeAnalysis = analyzeVolume(volumes, 20);
        } catch (e) {
            console.warn("Errore nell'analisi del volume, uso valore predefinito");
        }
        
        // Rilevamento di pattern candelstick con gestione errori
        let candlePatterns = [];
        try {
            candlePatterns = detectCandlePatterns(prices);
        } catch (e) {
            console.warn("Errore nel rilevamento pattern candlestick");
        }
        
        // Determina la forza del trend corrente
        let trendStrength = 0;
        try {
            trendStrength = determineTrendStrength(prices, sma20, sma50, sma200, rsi);
        } catch (e) {
            console.warn("Errore nel calcolo della forza del trend, uso valore predefinito");
            // Usa il trend basato sulla variazione di prezzo 24h
            trendStrength = crypto.price_change_percentage_24h > 0 ? 0.5 : -0.5;
        }
        
        // Verifica se siamo in un'area di ipercomprato o ipervenduto
        const isOverbought = rsi > 70;
        const isOversold = rsi < 30;
        
        // Verifica di divergenze RSI con gestione errori
        let rsiDivergence = 'NONE';
        try {
            rsiDivergence = detectRSIDivergence(prices, rsi);
        } catch (e) {
            console.warn("Errore nel rilevamento divergenze RSI");
        }
        
        // Rilevamento cross importanti con gestione errori
        let goldCross = false;
        let deathCross = false;
        try {
            goldCross = detectCross(sma50, sma200, true);
            deathCross = detectCross(sma50, sma200, false);
        } catch (e) {
            console.warn("Errore nel rilevamento cross delle medie mobili");
        }
        
        // Verifica MACD per cambi di trend con gestione errori
        let macdCrossover = 'NONE';
        try {
            macdCrossover = detectMACDCrossover(macd);
        } catch (e) {
            console.warn("Errore nel rilevamento crossover MACD");
        }
        
        // Analisi delle Bollinger Bands con gestione errori
        let bbSqueeze = false;
        let bbBreakout = 'NONE';
        try {
            bbSqueeze = detectBollingerSqueeze(bbandsUpper, bbandsLower, 20);
            bbBreakout = detectBollingerBreakout(prices, bbandsUpper, bbandsLower);
        } catch (e) {
            console.warn("Errore nell'analisi delle Bollinger Bands");
        }
        
        // Analisi finale per determinare il segnale
        let signalType = 'NEUTRAL';
        let signalStrength = 50;
        let patternDetected = 'NESSUNO';
        
        // Verifica condizioni di base
        const priceChange = crypto.price_change_percentage_24h;
        if (priceChange > 5) {
            signalType = 'BUY';
            signalStrength = 60;
        } else if (priceChange < -5) {
            signalType = 'SELL';
            signalStrength = 60;
        }
        
        // Segnali di ACQUISTO
        if (
            (isOversold) ||
            (goldCross) || 
            (macdCrossover === 'BULLISH') ||
            (bbBreakout === 'UP') ||
            (candlePatterns.includes('HAMMER') || candlePatterns.includes('BULLISH_ENGULFING'))
        ) {
            signalType = 'BUY';
            signalStrength = 60;
            
            // Aumenta la forza del segnale in base a condizioni aggiuntive
            if (isOversold) signalStrength += 5;
            if (rsiDivergence === 'BULLISH') signalStrength += 10;
            if (goldCross) signalStrength += 10;
            if (macdCrossover === 'BULLISH') signalStrength += 10;
            if (volumeAnalysis > 1.5) signalStrength += 5;
            if (candlePatterns.length > 0) {
                signalStrength += 10;
                patternDetected = candlePatterns[0];
            }
            if (bbBreakout === 'UP') signalStrength += 5;
            if (trendStrength > 0) signalStrength += 5;
            
            // Limita la forza del segnale
            signalStrength = Math.min(signalStrength, 98);
        }
        
        // Segnali di VENDITA
        else if (
            (isOverbought) ||
            (deathCross) || 
            (macdCrossover === 'BEARISH') ||
            (bbBreakout === 'DOWN') ||
            (candlePatterns.includes('SHOOTING_STAR') || candlePatterns.includes('BEARISH_ENGULFING'))
        ) {
            signalType = 'SELL';
            signalStrength = 60;
            
            // Aumenta la forza del segnale in base a condizioni aggiuntive
            if (isOverbought) signalStrength += 5;
            if (rsiDivergence === 'BEARISH') signalStrength += 10;
            if (deathCross) signalStrength += 10;
            if (macdCrossover === 'BEARISH') signalStrength += 10;
            if (volumeAnalysis > 1.5) signalStrength += 5;
            if (candlePatterns.length > 0) {
                signalStrength += 10;
                patternDetected = candlePatterns[0];
            }
            if (bbBreakout === 'DOWN') signalStrength += 5;
            if (trendStrength < 0) signalStrength += 5;
            
            // Limita la forza del segnale
            signalStrength = Math.min(signalStrength, 98);
        }
        
        // Valori MACD e RSI garantiti
        const macdValue = macd.histogram && macd.histogram.length > 0 ? 
            macd.histogram[macd.histogram.length-1].toFixed(4) : "0.0000";
        const rsiValue = typeof rsi === 'number' ? Math.round(rsi) : 50;
        
        return {
            signalType,
            signalStrength,
            rsi: rsiValue,
            macd: macdValue,
            trendStrength: typeof trendStrength === 'number' ? trendStrength.toFixed(2) : "0.00",
            patternDetected: patternDetected || 'NESSUNO'
        };
    } catch (error) {
        console.error("Errore nell'analisi tecnica avanzata:", error);
        // Fallback semplice
        const priceChange = crypto.price_change_percentage_24h;
        const volatility = Math.abs(priceChange);
        const signalType = priceChange > 5 ? 'BUY' : priceChange < -5 ? 'SELL' : 'NEUTRAL';
        const confidence = Math.min(volatility * 3, 90);
        
        return {
            signalType,
            signalStrength: Math.floor(confidence),
            rsi: 50,
            macd: "0.0000",
            trendStrength: "0.00",
            patternDetected: 'NESSUNO'
        };
    }
}

function calculatePreciseTargetPrice(crypto, analysis) {
    const currentPrice = crypto.current_price;
    const volatility = Math.abs(crypto.price_change_percentage_24h) / 100;
    
    // Calcola target price in base al tipo di segnale e alla forza
    if (analysis.signalType === 'BUY') {
        // Target più conservativo se la forza del segnale è minore
        if (analysis.signalStrength < 80) {
            return currentPrice * (1 + (0.05 + volatility));
        } 
        // Target più aggressivo se la forza del segnale è maggiore
        else {
            return currentPrice * (1 + (0.08 + volatility * 1.5));
        }
    } 
    else if (analysis.signalType === 'SELL') {
        // Target più conservativo se la forza del segnale è minore
        if (analysis.signalStrength < 80) {
            return currentPrice * (1 - (0.05 + volatility));
        } 
        // Target più aggressivo se la forza del segnale è maggiore
        else {
            return currentPrice * (1 - (0.08 + volatility * 1.5));
        }
    }
    
    return currentPrice;
}

function calculatePreciseStopLoss(crypto, analysis) {
    const currentPrice = crypto.current_price;
    const volatility = Math.abs(crypto.price_change_percentage_24h) / 100;
    const atr = calculateATR(crypto, 14);
    
    // Stop loss basato sull'ATR per una maggiore precisione
    if (analysis.signalType === 'BUY') {
        return currentPrice * (1 - Math.max(0.02, atr * 1.5));
    } 
    else if (analysis.signalType === 'SELL') {
        return currentPrice * (1 + Math.max(0.02, atr * 1.5));
    }
    
    return currentPrice;
}

function calculateAdvancedSupportResistance(crypto, historicalData) {
    try {
        const { prices } = historicalData;
        const currentPrice = crypto.current_price;
        
        if (!prices || prices.length < 20) {
            throw new Error("Dati insufficienti per calcolare supporti e resistenze");
        }
        
        // Cerca i swing high e swing low recenti
        const swings = findPriceSwings(prices, Math.min(10, Math.floor(prices.length / 5)));
        
        // Identifica zone di supporto dalle oscillazioni basse recenti
        const supports = swings.lows
            .filter(price => price < currentPrice)
            .sort((a, b) => b - a)
            .slice(0, 3);
        
        // Identifica zone di resistenza dalle oscillazioni alte recenti
        const resistances = swings.highs
            .filter(price => price > currentPrice)
            .sort((a, b) => a - b)
            .slice(0, 3);
        
        // Se non ci sono abbastanza livelli, usa il calcolo basato sulla volatilità
        const fallbackLevels = calculateSupportResistance(crypto);
        
        return {
            support: supports.length > 0 ? supports : fallbackLevels.support,
            resistance: resistances.length > 0 ? resistances : fallbackLevels.resistance
        };
    } catch (error) {
        console.error("Errore nel calcolo dei supporti e resistenze:", error);
        
        // Fallback: usa un calcolo semplice basato sulla volatilità
        const volatilityFactor = Math.abs(crypto.price_change_percentage_24h) / 100;
        return {
            support: [
                crypto.current_price * (1 - volatilityFactor * 0.5),
                crypto.current_price * (1 - volatilityFactor * 1),
                crypto.current_price * (1 - volatilityFactor * 1.5)
            ],
            resistance: [
                crypto.current_price * (1 + volatilityFactor * 0.5),
                crypto.current_price * (1 + volatilityFactor * 1),
                crypto.current_price * (1 + volatilityFactor * 1.5)
            ]
        };
    }
}

function findPriceSwings(prices, period) {
    try {
        if (!prices || prices.length < period * 2 + 1) {
            throw new Error(`Dati insufficienti per trovare swing points. Servono almeno ${period * 2 + 1} punti.`);
        }
        
        // Adatta il periodo se troppo grande rispetto ai dati
        const safePeriod = Math.min(period, Math.floor(prices.length / 5));
        
        const highs = [];
        const lows = [];
        
        // Cerca pivot points (minimi e massimi locali)
        for (let i = safePeriod; i < prices.length - safePeriod; i++) {
            try {
                const leftPrices = prices.slice(i - safePeriod, i);
                const rightPrices = prices.slice(i + 1, i + safePeriod + 1);
                const currentPrice = prices[i];
                
                if (!leftPrices.length || !rightPrices.length) continue;
                
                // Verifica se il punto corrente è un massimo locale
                if (currentPrice > Math.max(...leftPrices) && currentPrice > Math.max(...rightPrices)) {
                    highs.push(currentPrice);
                }
                
                // Verifica se il punto corrente è un minimo locale
                if (currentPrice < Math.min(...leftPrices) && currentPrice < Math.min(...rightPrices)) {
                    lows.push(currentPrice);
                }
            } catch (innerError) {
                console.warn(`Errore nell'analisi del punto ${i}:`, innerError);
                continue;
            }
        }
        
        // Se non abbiamo trovato abbastanza swing points, usa un metodo più semplice
        if (highs.length < 2 || lows.length < 2) {
            // Trova semplicemente i massimi e minimi recenti
            const lastSegment = prices.slice(-20);
            const max = Math.max(...lastSegment);
            const min = Math.min(...lastSegment);
            
            // Aggiungi questi punti se non ci sono già
            if (highs.length === 0) highs.push(max);
            if (lows.length === 0) lows.push(min);
        }
        
        return { highs, lows };
    } catch (error) {
        console.error('Errore nel trovare swing points:', error);
        // Fallback: trova semplicemente massimo e minimo dell'intero array
        const max = Math.max(...prices);
        const min = Math.min(...prices);
        return {
            highs: [max],
            lows: [min]
        };
    }
}

function calculateATR(crypto, period) {
    // Implementazione semplificata dell'ATR basata sulla volatilità
    return Math.abs(crypto.price_change_percentage_24h) / 100 / 5;
}

function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEMA = calculateEMA(prices, fastPeriod);
    const slowEMA = calculateEMA(prices, slowPeriod);
    
    // Calcola la linea MACD (differenza tra EMA veloce e lenta)
    const macdLine = [];
    const shortestLength = Math.min(fastEMA.length, slowEMA.length);
    
    for (let i = 0; i < shortestLength; i++) {
        macdLine.push(fastEMA[fastEMA.length - shortestLength + i] - slowEMA[slowEMA.length - shortestLength + i]);
    }
    
    // Calcola la linea del segnale (EMA della linea MACD)
    const signalLine = calculateEMA(macdLine, signalPeriod);
    
    // Calcola l'istogramma (differenza tra linea MACD e linea del segnale)
    const histogram = [];
    for (let i = 0; i < signalLine.length; i++) {
        histogram.push(macdLine[macdLine.length - signalLine.length + i] - signalLine[i]);
    }
    
    return {
        macdLine,
        signalLine,
        histogram
    };
}

function detectRSIDivergence(prices, rsi) {
    // Prendi gli ultimi 14 punti per l'analisi
    const recentPrices = prices.slice(-14);
    const recentRSI = rsi.slice(-14);
    
    // Cerca i massimi locali nei prezzi e nel RSI
    let priceHighs = [];
    let rsiHighs = [];
    
    // Cerca i minimi locali nei prezzi e nel RSI
    let priceLows = [];
    let rsiLows = [];
    
    for (let i = 1; i < recentPrices.length - 1; i++) {
        // Massimi locali
        if (recentPrices[i] > recentPrices[i-1] && recentPrices[i] > recentPrices[i+1]) {
            priceHighs.push({ index: i, value: recentPrices[i] });
        }
        if (recentRSI[i] > recentRSI[i-1] && recentRSI[i] > recentRSI[i+1]) {
            rsiHighs.push({ index: i, value: recentRSI[i] });
        }
        
        // Minimi locali
        if (recentPrices[i] < recentPrices[i-1] && recentPrices[i] < recentPrices[i+1]) {
            priceLows.push({ index: i, value: recentPrices[i] });
        }
        if (recentRSI[i] < recentRSI[i-1] && recentRSI[i] < recentRSI[i+1]) {
            rsiLows.push({ index: i, value: recentRSI[i] });
        }
    }
    
    // Verifica divergenza rialzista: prezzi fanno minimi più bassi ma RSI fa minimi più alti
    if (priceLows.length >= 2 && rsiLows.length >= 2) {
        if (priceLows[priceLows.length-1].value < priceLows[priceLows.length-2].value && 
            rsiLows[rsiLows.length-1].value > rsiLows[rsiLows.length-2].value) {
            return 'BULLISH';
        }
    }
    
    // Verifica divergenza ribassista: prezzi fanno massimi più alti ma RSI fa massimi più bassi
    if (priceHighs.length >= 2 && rsiHighs.length >= 2) {
        if (priceHighs[priceHighs.length-1].value > priceHighs[priceHighs.length-2].value && 
            rsiHighs[rsiHighs.length-1].value < rsiHighs[rsiHighs.length-2].value) {
            return 'BEARISH';
        }
    }
    
    return 'NONE';
}

function detectCross(shortMA, longMA, isGoldenCross) {
    // Dobbiamo avere almeno 2 punti per verificare un incrocio
    if (shortMA.length < 2 || longMA.length < 2) return false;
    
    // Prendi gli ultimi due punti per ogni MA
    const short1 = shortMA[shortMA.length - 2];
    const short2 = shortMA[shortMA.length - 1];
    const long1 = longMA[longMA.length - 2];
    const long2 = longMA[longMA.length - 1];
    
    // Verifica se c'è stato un incrocio (Golden Cross: short incrocia long dal basso)
    if (isGoldenCross) {
        return short1 < long1 && short2 > long2;
    } 
    // Death Cross: short incrocia long dall'alto
    else {
        return short1 > long1 && short2 < long2;
    }
}

function detectMACDCrossover(macd) {
    const { histogram } = macd;
    
    // Abbiamo bisogno di almeno 2 punti per individuare un crossover
    if (histogram.length < 2) return 'NONE';
    
    // Verifica se l'istogramma è passato da negativo a positivo (segnale rialzista)
    if (histogram[histogram.length - 2] < 0 && histogram[histogram.length - 1] > 0) {
        return 'BULLISH';
    }
    
    // Verifica se l'istogramma è passato da positivo a negativo (segnale ribassista)
    if (histogram[histogram.length - 2] > 0 && histogram[histogram.length - 1] < 0) {
        return 'BEARISH';
    }
    
    return 'NONE';
}

function detectBollingerSqueeze(upper, lower, period) {
    // Prendi le ultime bande di Bollinger per verificare se c'è una "stretta"
    const recentUpper = upper.slice(-period);
    const recentLower = lower.slice(-period);
    
    // Calcola la distanza media tra le bande
    let sumDistance = 0;
    for (let i = 0; i < recentUpper.length; i++) {
        sumDistance += recentUpper[i] - recentLower[i];
    }
    const avgDistance = sumDistance / recentUpper.length;
    
    // Verifica se la distanza attuale è inferiore alla media (stretta)
    const currentDistance = recentUpper[recentUpper.length-1] - recentLower[recentLower.length-1];
    
    return currentDistance < avgDistance * 0.8;
}

function detectBollingerBreakout(prices, upper, lower) {
    // Dobbiamo avere dati sufficienti
    if (prices.length < 2 || upper.length < 2 || lower.length < 2) return 'NONE';
    
    const lastPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2];
    const lastUpper = upper[upper.length - 1];
    const lastLower = lower[lower.length - 1];
    
    // Breakout verso l'alto
    if (prevPrice < lastUpper && lastPrice > lastUpper) {
        return 'UP';
    }
    
    // Breakout verso il basso
    if (prevPrice > lastLower && lastPrice < lastLower) {
        return 'DOWN';
    }
    
    return 'NONE';
}

function determineTrendStrength(prices, sma20, sma50, sma200, rsi) {
    let strength = 0;
    
    // Verifica la direzione delle medie mobili
    if (sma20[sma20.length - 1] > sma50[sma50.length - 1]) {
        strength += 0.3; // Trend rialzista a breve termine
    } else {
        strength -= 0.3; // Trend ribassista a breve termine
    }
    
    if (sma50[sma50.length - 1] > sma200[sma200.length - 1]) {
        strength += 0.5; // Trend rialzista a lungo termine
    } else {
        strength -= 0.5; // Trend ribassista a lungo termine
    }
    
    // Verifica la forza del RSI (sopra 50 = rialzista, sotto 50 = ribassista)
    if (rsi > 50) {
        strength += (rsi - 50) / 50; // Più il RSI è alto, più il trend è forte
    } else {
        strength -= (50 - rsi) / 50; // Più il RSI è basso, più il trend è debole
    }
    
    // Limita il valore tra -1 e 1
    return Math.max(-1, Math.min(1, strength));
}

function analyzeVolume(volumes, period) {
    // Calcola il volume medio del periodo specificato
    const recentVolumes = volumes.slice(-period);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    
    // Calcola il rapporto tra il volume attuale e la media
    const currentVolume = volumes[volumes.length - 1];
    
    return currentVolume / avgVolume;
}

function detectKeyLevels(prices, lookbackPeriod) {
    // Utilizza la stessa logica di findPriceSwings ma con una struttura dati diversa
    const levels = [];
    
    // Cerca i livelli chiave guardando ai pivot points
    for (let i = lookbackPeriod; i < prices.length - lookbackPeriod; i++) {
        const leftPrices = prices.slice(i - lookbackPeriod, i);
        const rightPrices = prices.slice(i + 1, i + lookbackPeriod + 1);
        const currentPrice = prices[i];
        
        // Verifica se il punto corrente è un massimo locale (resistenza)
        if (currentPrice > Math.max(...leftPrices) && currentPrice > Math.max(...rightPrices)) {
            levels.push({
                price: currentPrice,
                type: 'resistance',
                strength: calculateLevelStrength(prices, i, currentPrice)
            });
        }
        
        // Verifica se il punto corrente è un minimo locale (supporto)
        if (currentPrice < Math.min(...leftPrices) && currentPrice < Math.min(...rightPrices)) {
            levels.push({
                price: currentPrice,
                type: 'support',
                strength: calculateLevelStrength(prices, i, currentPrice)
            });
        }
    }
    
    // Raggruppa livelli simili (entro un certo range percentuale)
    return consolidateLevels(levels);
}

function calculateLevelStrength(prices, index, levelPrice) {
    // La forza di un livello può dipendere da:
    // 1. Quante volte il prezzo ha reagito a questo livello
    // 2. Il volume scambiato a questo livello (non disponibile in questo contesto semplificato)
    // 3. La durata del livello (quanto tempo ha resistito)
    
    // Qui usiamo una misura semplificata: conta quante volte il prezzo si è avvicinato 
    // a questo livello (entro una certa percentuale)
    let touchCount = 0;
    const threshold = 0.02; // 2% di tolleranza
    
    for (let i = 0; i < prices.length; i++) {
        if (i !== index) {
            const difference = Math.abs(prices[i] - levelPrice) / levelPrice;
            if (difference < threshold) {
                touchCount++;
            }
        }
    }
    
    // Restituisci un punteggio di forza tra 1 e 10
    return Math.min(10, 1 + touchCount);
}

function consolidateLevels(levels) {
    if (levels.length <= 1) return levels;
    
    // Ordina i livelli per prezzo
    levels.sort((a, b) => a.price - b.price);
    
    const consolidated = [];
    let currentGroup = [levels[0]];
    
    // Raggruppa livelli simili (entro il 3% l'uno dall'altro)
    for (let i = 1; i < levels.length; i++) {
        const previousLevel = currentGroup[currentGroup.length - 1];
        const currentLevel = levels[i];
        
        // Se il livello è entro il 3% del precedente, aggiungilo al gruppo attuale
        if ((currentLevel.price - previousLevel.price) / previousLevel.price < 0.03) {
            currentGroup.push(currentLevel);
        } else {
            // Altrimenti, finalizza il gruppo corrente e iniziane uno nuovo
            const avgPrice = currentGroup.reduce((sum, level) => sum + level.price, 0) / currentGroup.length;
            const maxStrength = Math.max(...currentGroup.map(level => level.strength));
            const dominantType = currentGroup.filter(l => l.type === 'support').length > 
                                 currentGroup.filter(l => l.type === 'resistance').length ? 
                                 'support' : 'resistance';
            
            consolidated.push({
                price: avgPrice,
                type: dominantType,
                strength: maxStrength
            });
            
            currentGroup = [currentLevel];
        }
    }
    
    // Aggiungi l'ultimo gruppo
    if (currentGroup.length > 0) {
        const avgPrice = currentGroup.reduce((sum, level) => sum + level.price, 0) / currentGroup.length;
        const maxStrength = Math.max(...currentGroup.map(level => level.strength));
        const dominantType = currentGroup.filter(l => l.type === 'support').length > 
                             currentGroup.filter(l => l.type === 'resistance').length ? 
                             'support' : 'resistance';
        
        consolidated.push({
            price: avgPrice,
            type: dominantType,
            strength: maxStrength
        });
    }
    
    return consolidated;
}

function detectCandlePatterns(prices) {
    // Per una vera analisi delle candele avremmo bisogno di OHLC (Open, High, Low, Close)
    // Questa è una versione semplificata basata sui prezzi di chiusura
    const patterns = [];
    
    // Prendi gli ultimi 5 prezzi per l'analisi
    const recentPrices = prices.slice(-5);
    
    // Pattern Hammer/Shooting Star (approssimazione semplificata)
    if (recentPrices.length >= 3) {
        const prev = recentPrices[recentPrices.length - 3];
        const middle = recentPrices[recentPrices.length - 2];
        const current = recentPrices[recentPrices.length - 1];
        
        // Hammer (dopo un trend ribassista)
        if (prev > middle && current > middle * 1.02) {
            patterns.push('HAMMER');
        }
        
        // Shooting Star (dopo un trend rialzista)
        if (prev < middle && current < middle * 0.98) {
            patterns.push('SHOOTING_STAR');
        }
        
        // Bullish Engulfing (semplificato)
        if (prev > middle && current > prev) {
            patterns.push('BULLISH_ENGULFING');
        }
        
        // Bearish Engulfing (semplificato)
        if (prev < middle && current < prev) {
            patterns.push('BEARISH_ENGULFING');
        }
    }
    
    return patterns;
}

export async function getCryptoHistoricalData(symbol, days = 30) {
    try {
        // Aggiungo timeout per evitare stalli
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        console.log(`Richiesta dati storici per ${symbol}...`);
        
        let apiUrl;
        try {
            // Alcuni simboli potrebbero avere nomi differenti, proviamo a normalizzare
            const normalizedSymbol = symbol.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/\./g, '-');
                
            apiUrl = `https://api.coingecko.com/api/v3/coins/${normalizedSymbol}/market_chart?vs_currency=usd&days=${days}`;
            
            // Per ID personalizzati o segnali predefiniti, usiamo bitcoin come fallback
            if (normalizedSymbol.startsWith('generic-') || normalizedSymbol === 'unknown') {
                apiUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`;
            }
        } catch (e) {
            apiUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`;
        }
        
        const response = await fetch(apiUrl, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            // Se abbiamo un errore, ritorna dati predefiniti invece di fallire
            console.warn(`Errore API: ${response.status} - ${response.statusText}`);
            return getDefaultHistoricalData(symbol);
        }
        
        const historicalData = await response.json();
        
        // Verifica che i dati siano stati ricevuti correttamente
        if (!historicalData || !historicalData.prices || historicalData.prices.length < 2) {
            console.warn(`Dati storici non validi per ${symbol}`);
            return getDefaultHistoricalData(symbol);
        }
        
        // Formatta i dati per il grafico
        const labels = historicalData.prices.map((_, index) => index);
        const prices = historicalData.prices.map(price => price[1]);
        
        return {
            labels: labels,
            datasets: [{
                label: `${symbol.toUpperCase()} Price`,
                data: prices,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        };
    } catch (error) {
        console.error(`Errore nel recupero dati storici per ${symbol}:`, error);
        return getDefaultHistoricalData(symbol);
    }
}

// Funzione per generare dati di grafico predefiniti
function getDefaultHistoricalData(symbol) {
    console.log(`Utilizzo dati storici predefiniti per ${symbol}`);
    
    // Costruisci una serie di dati di esempio basata sul simbolo
    const symbolHash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const startPrice = 1000 + (symbolHash % 1000);
    
    // Crea una tendenza basata sul carattere iniziale (su o giù)
    const trend = symbol.charCodeAt(0) % 2 === 0 ? 1 : -1;
    
    // Genera dati che sembrano reali (30 giorni)
    const prices = [];
    let currentPrice = startPrice;
    
    for (let i = 0; i < 30; i++) {
        // Piccole fluttuazioni casuali con tendenza generale
        const volatility = startPrice * 0.02; // 2% di volatilità
        const change = (Math.random() - 0.5) * volatility + (trend * startPrice * 0.002 * i);
        currentPrice += change;
        currentPrice = Math.max(currentPrice, startPrice * 0.7); // Evita prezzi troppo bassi
        prices.push(currentPrice);
    }
    
    return {
        labels: Array.from({length: 30}, (_, i) => i),
        datasets: [{
            label: `${symbol.toUpperCase()} Price (Dati di esempio)`,
            data: prices,
            borderColor: 'rgb(255, 99, 132)',
            tension: 0.1
        }]
    };
}
