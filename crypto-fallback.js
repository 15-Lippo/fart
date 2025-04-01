/**
 * crypto-fallback.js
 * Sistema unificato per gestire errori di caricamento e garantire la visualizzazione dei segnali
 */

// Dati hardcoded per segnali di trading
const HARDCODED_SIGNALS = [
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

// Definisce il modulo di fallback
const cryptoFallback = {
    // Mostra un messaggio di errore semplice
    mostraErroreSegnali: function() {
        console.warn("Mostrando messaggio di errore API");
        const container = document.getElementById('cryptoSignalsContainer');
        
        if (!container) return;
        
        container.innerHTML = `
            <div class="crypto-card p-3 mb-3">
                <h5 class="text-warning"><i class="fas fa-exclamation-triangle me-2"></i> Servizio temporaneamente non disponibile</h5>
                <p>I nostri server stanno riscontrando problemi temporanei con le API di CoinMarketCap.</p>
                <p>Riprova tra qualche minuto o controlla i grafici per analisi tecniche aggiornate.</p>
                <div class="d-flex justify-content-center mt-3">
                    <button class="btn btn-sm btn-outline-success" onclick="initializeApp()">
                        <i class="fas fa-sync-alt me-1"></i> Riprova
                    </button>
                </div>
            </div>
        `;
    },
    
    // Mostra segnali hardcoded con un messaggio informativo
    mostraErroriSegnaliHardcoded: function() {
        console.log("Mostrando segnali hardcoded come fallback");
        
        // Salva nella cache globale per poterli usare anche altrove
        if (window.dataCache) {
            window.dataCache.signals = HARDCODED_SIGNALS;
            window.dataCache.signalsFetchTime = Date.now();
        }
        
        // Ottieni la funzione dal modulo crypto-app.js
        try {
            if (window.cryptoApp && typeof window.cryptoApp.renderCryptoSignals === 'function') {
                window.cryptoApp.renderCryptoSignals(HARDCODED_SIGNALS);
            } else {
                // Usa la funzione renderCryptoSignals dal crypto-app.js importato
                const container = document.getElementById('cryptoSignalsContainer');
                
                if (!container) return;
                
                // Assicuriamoci che i segnali siano presenti e validi
                container.innerHTML = `
                    <div class="mb-3">
                        <h5 class="small text-center text-warning">
                            <i class="fas fa-exclamation-triangle me-1"></i>
                            Segnali dimostrativi - API non disponibile
                        </h5>
                    </div>
                `;
                
                // Generiamo il HTML per tutti i segnali
                container.innerHTML += HARDCODED_SIGNALS.map(signal => {
                    // Formatta il supporto e la resistenza
                    const supportDisplay = signal.support.length > 0 ? signal.support[0] : 'N/A';
                    const resistanceDisplay = signal.resistance.length > 0 ? signal.resistance[0] : 'N/A';
                    
                    return `
                        <div class="crypto-card p-3 mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h5 class="mb-0">${signal.pair}</h5>
                                <span class="signal-badge ${
                                    signal.signalType === 'BUY' ? 'bg-success text-white' : 
                                    signal.signalType === 'SELL' ? 'bg-danger text-white' : 'bg-secondary text-white'
                                }">
                                    ${signal.signalType}
                                </span>
                            </div>
                            
                            <div class="d-flex justify-content-between">
                                <div class="confidence-meter">
                                    <small class="text-muted">Affidabilità</small>
                                    <div class="progress" style="height: 8px;">
                                        <div class="progress-bar ${signal.confidence > 85 ? 'bg-success' : signal.confidence > 70 ? 'bg-warning' : 'bg-danger'}" 
                                            role="progressbar" style="width: ${signal.confidence}%;" 
                                            aria-valuenow="${signal.confidence}" aria-valuemin="0" aria-valuemax="100">
                                        </div>
                                    </div>
                                    <small>${signal.confidence}%</small>
                                </div>
                                <div>
                                    <small class="text-muted">Pattern</small>
                                    <p class="mb-0 badge bg-info">${signal.indicators.patternDetected}</p>
                                </div>
                            </div>
                            
                            <div class="row mt-3">
                                <div class="col-6">
                                    <small class="text-muted">Entry Price</small>
                                    <p class="mb-0">$${signal.entryPrice}</p>
                                </div>
                                <div class="col-6 text-end">
                                    <small class="text-muted">24h Change</small>
                                    <p class="mb-0 ${parseFloat(signal.priceChange24h) > 0 ? 'text-success' : 'text-danger'}">
                                        ${signal.priceChange24h}%
                                    </p>
                                </div>
                            </div>
                            
                            <div class="row mt-2">
                                <div class="col-4">
                                    <small class="text-muted">Target</small>
                                    <p class="mb-0 text-success">$${signal.targetPrice}</p>
                                </div>
                                <div class="col-4">
                                    <small class="text-muted">Stop Loss</small>
                                    <p class="mb-0 text-danger">$${signal.stopLoss}</p>
                                </div>
                                <div class="col-4 text-end">
                                    <small class="text-muted">Potenziale</small>
                                    <p class="mb-0 ${parseFloat(signal.potentialGain) > 0 ? 'text-success' : 'text-danger'}">
                                        ${signal.potentialGain}%
                                    </p>
                                </div>
                            </div>
                            
                            <div class="row mt-2">
                                <div class="col-4">
                                    <small class="text-muted">RSI</small>
                                    <p class="mb-0 ${signal.indicators.rsi > 70 ? 'text-danger' : signal.indicators.rsi < 30 ? 'text-success' : 'text-muted'}">
                                        ${signal.indicators.rsi}
                                    </p>
                                </div>
                                <div class="col-4">
                                    <small class="text-muted">MACD</small>
                                    <p class="mb-0 ${parseFloat(signal.indicators.macd) > 0 ? 'text-success' : 'text-danger'}">
                                        ${signal.indicators.macd}
                                    </p>
                                </div>
                                <div class="col-4">
                                    <small class="text-muted">Risk/Reward</small>
                                    <p class="mb-0 text-info">${signal.riskReward}</p>
                                </div>
                            </div>
                            
                            <div class="row mt-2">
                                <div class="col-6">
                                    <small class="text-muted">Support</small>
                                    <p class="mb-0 text-info">${supportDisplay}</p>
                                </div>
                                <div class="col-6 text-end">
                                    <small class="text-muted">Resistance</small>
                                    <p class="mb-0 text-warning">${resistanceDisplay}</p>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (error) {
            console.error("Errore nella visualizzazione dei segnali hardcoded:", error);
            this.mostraErroreSegnali();
        }
    },
    
    // Verifica periodicamente se ci sono errori
    verificaErrori: function() {
        console.log("Verifico eventuali errori nelle API...");
        
        // Controlla se il container dei segnali contiene errori
        const container = document.getElementById('cryptoSignalsContainer');
        
        if (!container) return;
        
        // Controlla se il container contiene spine di caricamento
        const hasSpinners = container.querySelectorAll('.crypto-loading-spinner').length > 0;
        
        // Controlla se abbiamo effettivamente dei segnali
        const hasSignals = container.querySelectorAll('.crypto-card').length > 1; // >1 perché potrebbe esserci la card del loader
        
        if (hasSpinners && !hasSignals) {
            console.warn("Rilevato errore API: spinner ancora visibile, nessun segnale caricato");
            this.mostraErroriSegnaliHardcoded();
            return true;
        }
        
        // Controlla anche il container del grafico
        const chartContainer = document.getElementById('portfolioSection');
        if (chartContainer) {
            const chartLoader = chartContainer.querySelector('#chart-loader');
            if (chartLoader && chartLoader.style.display !== 'none') {
                // Il loader è ancora visibile dopo un lungo periodo
                console.warn("Rilevato possibile errore nei grafici");
                
                // Verifica se ci sono chart container visibili
                const chartCanvases = chartContainer.querySelectorAll('canvas');
                if (chartCanvases.length === 0) {
                    // Non ci sono grafici, creiamo qualcosa di base
                    chartLoader.style.display = 'none';
                    chartContainer.innerHTML += `
                        <div class="crypto-card p-3 mb-3">
                            <h5>Analisi grafica</h5>
                            <p class="text-muted small">Non è stato possibile caricare i grafici in tempo reale al momento.</p>
                            <p>Consulta invece i segnali di trading sopra per le ultime indicazioni.</p>
                        </div>
                    `;
                    return true;
                }
            }
        }
        
        return false;
    }
};

// Esporta il modulo
export default cryptoFallback; 