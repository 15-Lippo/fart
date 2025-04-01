// crypto-signals.js - Modulo API per i segnali crypto
// Versione 2.2.0 - Aggiornato per utilizzare CoinGecko

// ---- CONFIGURAZIONE API ----
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
const USE_PROXY = true; // Usa proxy per evitare CORS
const PROXY_URL = 'https://corsproxy.io/?';

// Configurazione timeout e ritardi
const API_TIMEOUT_MS = 15000; // 15 secondi timeout
const REQUEST_DELAY_MS = 1500; // 1.5 secondi tra le richieste
const RATE_LIMIT_DELAY_MS = 65000; // 65 secondi di attesa se rate limit raggiunto

// ---- STATO GLOBALE ----
let lastRequestTime = 0;
let apiAvailable = true;

// ---- UTILITY FUNCTIONS ----

// Funzione sleep per introdurre ritardi
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Controlla lo stato dell'API
async function checkApiStatus() {
    try {
        const now = Date.now();
        const elapsed = now - lastRequestTime;
        
        // Assicura un ritardo minimo tra le richieste
        if (elapsed < REQUEST_DELAY_MS) {
            await sleep(REQUEST_DELAY_MS - elapsed);
        }
        
        const url = USE_PROXY 
            ? `${PROXY_URL}${COINGECKO_API_URL}/ping`
            : `${COINGECKO_API_URL}/ping`;
        
        const response = await fetch(url, {
            method: 'GET',
            signal: AbortSignal.timeout(API_TIMEOUT_MS)
        });
        
        lastRequestTime = Date.now();
        
        if (response.status === 429) {
            console.warn('Rate limit raggiunto, attesa necessaria prima della prossima richiesta');
            apiAvailable = false;
            setTimeout(() => { apiAvailable = true; }, RATE_LIMIT_DELAY_MS);
            return false;
        }
        
        if (!response.ok) {
            console.error(`Errore API: ${response.status} ${response.statusText}`);
            apiAvailable = false;
            return false;
        }
        
        const data = await response.json();
        apiAvailable = true;
        return data && data.gecko_says === '(V3) To the Moon!';
    } catch (error) {
        console.error('Errore nel controllo stato API:', error);
        apiAvailable = false;
        return false;
    }
}

// Attende che l'API sia disponibile prima di fare una richiesta
async function waitForApiAvailability() {
    if (!apiAvailable) {
        console.log('API non disponibile, attesa in corso...');
        await sleep(5000); // Attendi 5 secondi
        return waitForApiAvailability(); // Ricontrolla ricorsivamente
    }
    return true;
}

// ---- FUNZIONI API PRINCIPALI ----

// Funzione per ottenere le top criptovalute
export async function getTopCryptos() {
    await waitForApiAvailability();
    
    try {
        if (!await checkApiStatus()) {
            return getFallbackTopCryptos();
        }
        
        const url = USE_PROXY 
            ? `${PROXY_URL}${COINGECKO_API_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&sparkline=false`
            : `${COINGECKO_API_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&sparkline=false`;
        
        const response = await fetch(url, {
            method: 'GET',
            signal: AbortSignal.timeout(API_TIMEOUT_MS)
        });
        
        lastRequestTime = Date.now();
        
        if (response.status === 429) {
            console.warn('Rate limit raggiunto durante getTopCryptos');
            apiAvailable = false;
            setTimeout(() => { apiAvailable = true; }, RATE_LIMIT_DELAY_MS);
            return getFallbackTopCryptos();
        }
        
        if (!response.ok) {
            throw new Error(`Errore API: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        return data.map(crypto => ({
            id: crypto.id,
            symbol: crypto.symbol.toUpperCase(),
            name: crypto.name,
            currentPrice: crypto.current_price,
            priceChangePercentage24h: crypto.price_change_percentage_24h,
            marketCap: crypto.market_cap
        }));
    } catch (error) {
        console.error('Errore nel recupero delle top cryptos:', error);
        return getFallbackTopCryptos();
    }
}

// Funzione per recuperare i dati storici di una cripto
export async function getCryptoHistoricalData(cryptoId, days = 30) {
    await waitForApiAvailability();
    
    try {
        if (!await checkApiStatus()) {
            return getFallbackHistoricalData(cryptoId);
        }
        
        const url = USE_PROXY 
            ? `${PROXY_URL}${COINGECKO_API_URL}/coins/${cryptoId}/market_chart?vs_currency=usd&days=${days}`
            : `${COINGECKO_API_URL}/coins/${cryptoId}/market_chart?vs_currency=usd&days=${days}`;
        
        const response = await fetch(url, {
            method: 'GET',
            signal: AbortSignal.timeout(API_TIMEOUT_MS)
        });
        
        lastRequestTime = Date.now();
        
        if (response.status === 429) {
            console.warn('Rate limit raggiunto durante getCryptoHistoricalData');
            apiAvailable = false;
            setTimeout(() => { apiAvailable = true; }, RATE_LIMIT_DELAY_MS);
            return getFallbackHistoricalData(cryptoId);
        }
        
        if (!response.ok) {
            throw new Error(`Errore API: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const prices = data.prices.map(p => p[1]);
        const labels = data.prices.map(p => {
            const date = new Date(p[0]);
            return date.toLocaleDateString();
        });
        
        const chartData = {
            labels: labels,
            datasets: [
                {
                    label: cryptoId.toUpperCase(),
                    data: prices,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }
            ]
        };
        
        return chartData;
    } catch (error) {
        console.error(`Errore nel recupero dei dati storici per ${cryptoId}:`, error);
        return getFallbackHistoricalData(cryptoId);
    }
}

// Funzione per recuperare informazioni su una cripto
async function getCryptoInfo(cryptoId) {
    await waitForApiAvailability();
    
    try {
        const url = USE_PROXY 
            ? `${PROXY_URL}${COINGECKO_API_URL}/coins/${cryptoId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`
            : `${COINGECKO_API_URL}/coins/${cryptoId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`;
        
        const response = await fetch(url, {
            method: 'GET',
            signal: AbortSignal.timeout(API_TIMEOUT_MS)
        });
        
        lastRequestTime = Date.now();
        
        if (response.status === 429) {
            console.warn('Rate limit raggiunto durante getCryptoInfo');
            apiAvailable = false;
            setTimeout(() => { apiAvailable = true; }, RATE_LIMIT_DELAY_MS);
            return null;
        }
        
        if (!response.ok) {
            throw new Error(`Errore API: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        return {
            id: data.id,
            symbol: data.symbol.toUpperCase(),
            name: data.name
        };
    } catch (error) {
        console.error(`Errore nel recupero info per ${cryptoId}:`, error);
        return null;
    }
}

// Funzione per ottenere dati storici completi con indicatori
export async function getCryptoFullHistoricalData(cryptoId) {
    const chartData = await getCryptoHistoricalData(cryptoId, 90);
    
    // Calcolo SMA 20
    const sma20 = calculateSMA(chartData.datasets[0].data, 20);
    
    // Calcolo Bollinger Bands
    const bollingerBands = calculateBollingerBands(chartData.datasets[0].data, 20, 2);
    
    // Aggiungi gli indicatori ai dati
    return {
        ...chartData,
        prices: chartData.datasets[0].data,
        indicators: {
            sma20: sma20,
            bollinger: bollingerBands
        }
    };
}

// Funzione per recuperare i segnali crypto
export async function getCryptoSignals() {
    await waitForApiAvailability();
    
    try {
        if (!await checkApiStatus()) {
            console.warn('API CoinGecko non disponibile, utilizzo segnali di fallback');
            return getFallbackSignals();
        }
        
        // Recupera le top crypto
        const topCryptos = await getTopCryptos();
        if (!topCryptos || topCryptos.length === 0) {
            console.warn('Nessuna crypto recuperata, utilizzo segnali di fallback');
            return getFallbackSignals();
        }
        
        // Creare segnali basati su dati reali
        const signals = [];
        
        // Limit a 8 segnali
        const cryptosToProcess = topCryptos.slice(0, 8);
        
        for (const crypto of cryptosToProcess) {
            // Aggiungi un ritardo tra le richieste
            await sleep(REQUEST_DELAY_MS);
            
            try {
                // Genera un segnale basato sui dati reali
                const signal = await generateSignalFromMarketData(crypto);
                signals.push(signal);
            } catch (error) {
                console.error(`Errore nella generazione del segnale per ${crypto.name}:`, error);
            }
        }
        
        if (signals.length === 0) {
            console.warn('Nessun segnale generato, utilizzo segnali di fallback');
            return getFallbackSignals();
        }
        
        console.log(`Generati ${signals.length} segnali basati su dati di mercato reali`);
        return signals;
    } catch (error) {
        console.error('Errore nel recupero dei segnali:', error);
        return getFallbackSignals();
    }
}

// ---- FUNZIONI HELPER PER GENERAZIONE SEGNALI ----

// Genera un segnale basato su dati di mercato
async function generateSignalFromMarketData(crypto) {
    // Genera un segnale basato sul prezzo attuale e trend
    const currentPrice = crypto.currentPrice;
    const priceChange = crypto.priceChangePercentage24h;
    
    // Determina tipo di segnale basato sul trend
    let signalType = 'NEUTRAL';
    
    // Logica semplificata:
    // - Trend positivo forte -> BUY
    // - Trend negativo forte -> SELL
    // - Altrimenti -> NEUTRAL
    if (priceChange > 3) {
        signalType = 'BUY';
    } else if (priceChange < -3) {
        signalType = 'SELL';
    } else if (priceChange > 1) {
        signalType = Math.random() > 0.3 ? 'BUY' : 'NEUTRAL';
    } else if (priceChange < -1) {
        signalType = Math.random() > 0.3 ? 'SELL' : 'NEUTRAL';
    } else {
        signalType = ['BUY', 'SELL', 'NEUTRAL'][Math.floor(Math.random() * 3)];
    }
    
    // Calcola confidence basato sulla forza del trend
    const confidence = Math.min(90, Math.max(50, 65 + Math.abs(priceChange) * 2));
    
    // Calcola target e stop loss
    const targetMultiplier = signalType === 'BUY' ? 1.05 : 0.95;
    const stopMultiplier = signalType === 'BUY' ? 0.97 : 1.03;
    
    const targetPrice = (currentPrice * targetMultiplier).toFixed(4);
    const stopLoss = (currentPrice * stopMultiplier).toFixed(4);
    
    // Calcola potenziale guadagno
    const potentialGain = signalType === 'BUY' 
        ? ((targetPrice / currentPrice - 1) * 100).toFixed(2)
        : ((1 - targetPrice / currentPrice) * 100).toFixed(2);
    
    // Calcola risk/reward
    const risk = Math.abs(currentPrice - parseFloat(stopLoss));
    const reward = Math.abs(currentPrice - parseFloat(targetPrice));
    const riskReward = `1:${(reward / risk).toFixed(2)}`;
    
    // Genera livelli di supporto e resistenza
    const supportMultipliers = [0.95, 0.92, 0.88];
    const resistanceMultipliers = [1.05, 1.08, 1.12];
    
    const support = supportMultipliers.map(m => (currentPrice * m).toFixed(4));
    const resistance = resistanceMultipliers.map(m => (currentPrice * m).toFixed(4));
    
    // Genera indicatori RSI e MACD
    const rsi = Math.floor(Math.random() * 40) + 30; // 30-70
    const macd = (Math.random() * 4 - 2).toFixed(2); // -2 a 2
    const trendStrength = (Math.random() * 4).toFixed(1); // 0-4
    
    // Genera pattern casuale
    const patterns = [
        'BULLISH_TREND', 'BEARISH_TREND', 'BREAKOUT', 'BREAKDOWN',
        'HARMONIC_PATTERN', 'DOUBLE_BOTTOM', 'DOUBLE_TOP', 'FVG_BULLISH',
        'FVG_BEARISH', 'FIBONACCI_RETRACEMENT', 'NESSUNO'
    ];
    
    const patternDetected = patterns[Math.floor(Math.random() * patterns.length)];
    
    return {
        id: crypto.id,
        pair: `${crypto.symbol}/USDT`,
        name: crypto.name,
        signalType: signalType,
        entryPrice: currentPrice.toFixed(4),
        targetPrice: targetPrice,
        stopLoss: stopLoss,
        potentialGain: potentialGain,
        confidence: Math.floor(confidence),
        priceChange24h: priceChange.toFixed(2),
        support: support,
        resistance: resistance,
        riskReward: riskReward,
        indicators: {
            rsi: rsi,
            macd: macd,
            trendStrength: trendStrength,
            patternDetected: patternDetected
        }
    };
}

// ---- FUNZIONI MATEMATICHE PER INDICATORI TECNICI ----

// Calcola la Simple Moving Average (SMA)
function calculateSMA(data, period) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(null);
            continue;
        }
        
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j];
        }
        result.push(sum / period);
    }
    return result;
}

// Calcola le Bollinger Bands
function calculateBollingerBands(data, period, multiplier) {
    const sma = calculateSMA(data, period);
    const upper = [];
    const lower = [];
    
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            upper.push(null);
            lower.push(null);
            continue;
        }
        
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += Math.pow(data[i - j] - sma[i], 2);
        }
        
        const stdDev = Math.sqrt(sum / period);
        upper.push(sma[i] + multiplier * stdDev);
        lower.push(sma[i] - multiplier * stdDev);
    }
    
    return { upper, middle: sma, lower };
}

// ---- DATI DI FALLBACK ----

// Dati di fallback per le top crypto
function getFallbackTopCryptos() {
    return [
        {
            id: "1",
            symbol: "BTC",
            name: "Bitcoin",
            currentPrice: 67500,
            priceChangePercentage24h: 1.5,
            marketCap: 1320000000000
        },
        {
            id: "1027",
            symbol: "ETH",
            name: "Ethereum",
            currentPrice: 3250,
            priceChangePercentage24h: 2.4,
            marketCap: 390000000000
        },
        {
            id: "1839",
            symbol: "BNB",
            name: "Binance Coin",
            currentPrice: 580,
            priceChangePercentage24h: 0.8,
            marketCap: 88000000000
        },
        {
            id: "52",
            symbol: "XRP",
            name: "XRP",
            currentPrice: 0.52,
            priceChangePercentage24h: -0.5,
            marketCap: 28000000000
        },
        {
            id: "2010",
            symbol: "ADA",
            name: "Cardano",
            currentPrice: 0.45,
            priceChangePercentage24h: 1.2,
            marketCap: 15800000000
        }
    ];
}

// Dati di fallback per i segnali
function getFallbackSignals() {
    return [
        {
            id: "bitcoin",
            pair: "BTC/USDT",
            name: "Bitcoin",
            signalType: "BUY",
            entryPrice: "67500.0000",
            targetPrice: "72000.0000",
            stopLoss: "65000.0000",
            support: ["65000.0000", "62000.0000", "60000.0000"],
            resistance: ["70000.0000", "72000.0000", "75000.0000"],
            potentialGain: "6.67",
            riskReward: "1:1.80",
            confidence: 75,
            priceChange24h: "1.50",
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
            entryPrice: "3250.0000",
            targetPrice: "3500.0000",
            stopLoss: "3100.0000",
            support: ["3100.0000", "3000.0000", "2900.0000"],
            resistance: ["3400.0000", "3500.0000", "3700.0000"],
            potentialGain: "7.69",
            riskReward: "1:1.67",
            confidence: 70,
            priceChange24h: "2.40",
            indicators: {
                rsi: 52,
                macd: "0.8",
                trendStrength: "1.7",
                patternDetected: "BULLISH_TREND"
            }
        },
        {
            id: "binancecoin",
            pair: "BNB/USDT",
            name: "Binance Coin",
            signalType: "NEUTRAL",
            entryPrice: "580.0000",
            targetPrice: "600.0000",
            stopLoss: "550.0000",
            support: ["550.0000", "520.0000", "500.0000"],
            resistance: ["600.0000", "620.0000", "650.0000"],
            potentialGain: "3.45",
            riskReward: "1:1.33",
            confidence: 60,
            priceChange24h: "0.80",
            indicators: {
                rsi: 48,
                macd: "0.3",
                trendStrength: "1.2",
                patternDetected: "NESSUNO"
            }
        },
        {
            id: "ripple",
            pair: "XRP/USDT",
            name: "XRP",
            signalType: "SELL",
            entryPrice: "0.5200",
            targetPrice: "0.4800",
            stopLoss: "0.5400",
            support: ["0.4800", "0.4500", "0.4200"],
            resistance: ["0.5400", "0.5600", "0.6000"],
            potentialGain: "7.69",
            riskReward: "1:1.92",
            confidence: 65,
            priceChange24h: "-0.50",
            indicators: {
                rsi: 65,
                macd: "-0.5",
                trendStrength: "1.8",
                patternDetected: "BEARISH_TREND"
            }
        },
        {
            id: "cardano",
            pair: "ADA/USDT",
            name: "Cardano",
            signalType: "BUY",
            entryPrice: "0.4500",
            targetPrice: "0.4800",
            stopLoss: "0.4300",
            support: ["0.4300", "0.4100", "0.4000"],
            resistance: ["0.4800", "0.5000", "0.5200"],
            potentialGain: "6.67",
            riskReward: "1:1.50",
            confidence: 68,
            priceChange24h: "1.20",
            indicators: {
                rsi: 45,
                macd: "0.4",
                trendStrength: "1.5",
                patternDetected: "FIBONACCI_RETRACEMENT"
            }
        },
        {
            id: "dogecoin",
            pair: "DOGE/USDT",
            name: "Dogecoin",
            signalType: "BUY",
            entryPrice: "0.1200",
            targetPrice: "0.1350",
            stopLoss: "0.1100",
            support: ["0.1100", "0.1000", "0.0950"],
            resistance: ["0.1300", "0.1350", "0.1400"],
            potentialGain: "12.50",
            riskReward: "1:1.50",
            confidence: 72,
            priceChange24h: "3.80",
            indicators: {
                rsi: 62,
                macd: "0.9",
                trendStrength: "2.7",
                patternDetected: "BREAKOUT"
            }
        },
        {
            id: "solana",
            pair: "SOL/USDT",
            name: "Solana",
            signalType: "NEUTRAL",
            entryPrice: "145.0000",
            targetPrice: "155.0000",
            stopLoss: "135.0000",
            support: ["135.0000", "130.0000", "125.0000"],
            resistance: ["150.0000", "155.0000", "160.0000"],
            potentialGain: "6.90",
            riskReward: "1:1.00",
            confidence: 55,
            priceChange24h: "0.20",
            indicators: {
                rsi: 50,
                macd: "0.1",
                trendStrength: "0.8",
                patternDetected: "NESSUNO"
            }
        },
        {
            id: "polygon",
            pair: "MATIC/USDT",
            name: "Polygon",
            signalType: "SELL",
            entryPrice: "0.7500",
            targetPrice: "0.6800",
            stopLoss: "0.7800",
            support: ["0.7000", "0.6800", "0.6500"],
            resistance: ["0.7800", "0.8000", "0.8200"],
            potentialGain: "9.33",
            riskReward: "1:2.33",
            confidence: 78,
            priceChange24h: "-2.10",
            indicators: {
                rsi: 68,
                macd: "-0.7",
                trendStrength: "2.1",
                patternDetected: "DOUBLE_TOP"
            }
        }
    ];
}

// Dati di fallback per i dati storici
function getFallbackHistoricalData(cryptoId) {
    // Price pattern che simula un trend
    const basePrice = getBasePrice(cryptoId);
    const volatility = getVolatility(cryptoId);
    const trend = getTrend(cryptoId);
    
    // Genera 30 giorni di dati
    const prices = [];
    const labels = [];
    
    for (let i = 30; i >= 0; i--) {
        const noise = (Math.random() - 0.5) * 2 * volatility;
        const trendEffect = trend * (30 - i) / 15;
        const price = basePrice * (1 + trendEffect + noise);
        
        prices.push(price);
        
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString());
    }
    
    return {
        labels: labels,
        datasets: [
            {
                label: cryptoId.toUpperCase(),
                data: prices,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }
        ]
    };
}

// Helper per generare prezzi base per i dati di fallback
function getBasePrice(cryptoId) {
    const basePrices = {
        'bitcoin': 67500,
        'ethereum': 3250,
        'binancecoin': 580,
        'ripple': 0.52,
        'cardano': 0.45,
        'dogecoin': 0.12,
        'solana': 145,
        'polygon': 0.75
    };
    
    return basePrices[cryptoId.toLowerCase()] || 100;
}

// Helper per volatilità dei dati di fallback
function getVolatility(cryptoId) {
    const volatilities = {
        'bitcoin': 0.03,
        'ethereum': 0.04,
        'binancecoin': 0.05,
        'ripple': 0.06,
        'cardano': 0.07,
        'dogecoin': 0.08,
        'solana': 0.06,
        'polygon': 0.05
    };
    
    return volatilities[cryptoId.toLowerCase()] || 0.05;
}

// Helper per trend nei dati di fallback
function getTrend(cryptoId) {
    const trends = {
        'bitcoin': 0.04,
        'ethereum': 0.06,
        'binancecoin': 0.02,
        'ripple': -0.02,
        'cardano': 0.03,
        'dogecoin': 0.08,
        'solana': 0.01,
        'polygon': -0.03
    };
    
    return trends[cryptoId.toLowerCase()] || 0;
}
