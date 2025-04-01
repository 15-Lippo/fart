/**
 * crypto-fallback.js
 * Sistema unificato per gestire errori di caricamento e garantire la visualizzazione dei segnali
 */

// Sistema di fallback per gestire errori comuni dell'applicazione
window.cryptoFallback = {
    // Flag per tenere traccia se il fallback è già stato attivato
    fallbackActivated: false,
    
    // Funzione per caricare Chart.js
    caricaChartJS: function() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js";
            script.onload = function() {
                console.log('Chart.js caricato con successo');
                window.cryptoFallback.caricaAnnotationPlugin()
                    .then(resolve)
                    .catch(reject);
            };
            script.onerror = function() {
                console.error('Errore nel caricamento di Chart.js');
                reject(new Error('Errore nel caricamento di Chart.js'));
            };
            document.head.appendChild(script);
        });
    },
    
    // Funzione per caricare il plugin di annotazione
    caricaAnnotationPlugin: function() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@2.1.0/dist/chartjs-plugin-annotation.min.js";
            script.onload = function() {
                console.log('Plugin di annotazione caricato con successo');
                if (window.Chart && window.ChartAnnotation) {
                    try {
                        Chart.register(window.ChartAnnotation);
                        console.log('Plugin di annotazione registrato correttamente');
                        resolve(true);
                    } catch (e) {
                        console.error('Errore durante la registrazione del plugin:', e);
                        reject(e);
                    }
                } else {
                    console.error('Chart.js o ChartAnnotation non disponibili dopo il caricamento');
                    reject(new Error('Librerie non disponibili'));
                }
            };
            script.onerror = function() {
                console.error('Errore nel caricamento del plugin di annotazione');
                reject(new Error('Errore nel caricamento del plugin'));
            };
            document.head.appendChild(script);
        });
    },
    
    // Funzione per mostrare un errore in caso di mancato caricamento dei segnali
    mostraErroreSegnali: function() {
        console.log("Attivazione fallback per errore segnali");
        
        // Evita chiamate multiple
        if (this.fallbackActivated) return;
        this.fallbackActivated = true;
        
        const container = document.getElementById('cryptoSignalsContainer');
        
        if (container) {
            container.innerHTML = `
                <div class="crypto-card p-3 mb-3">
                    <h5 class="text-danger">Errore nel caricamento dei segnali</h5>
                    <p>Non è stato possibile recuperare i segnali di trading dall'API CoinGecko.</p>
                    <div class="alert alert-warning small mt-2">
                        <p class="mb-0"><strong>Possibili cause:</strong></p>
                        <ul class="mb-0 pl-3">
                            <li>Problemi di connessione internet</li>
                            <li>Limiti API superati (429 - Too Many Requests)</li>
                            <li>Errore temporaneo del server</li>
                        </ul>
                    </div>
                    <button class="btn btn-sm btn-outline-success mt-3" onclick="this.disabled=true; this.innerHTML='Caricamento...'; window.cryptoFallback.riavviaSegnali();">
                        Riprova caricamento
                    </button>
                </div>
            `;
        }
        
        // Aggiorna anche la sezione dei grafici se necessario
        const portfolioSection = document.getElementById('portfolioSection');
        if (portfolioSection) {
            const chartLoader = document.getElementById('chart-loader');
            if (chartLoader) chartLoader.style.display = 'none';
            
            // Aggiungi messaggio di errore solo se non ci sono altri contenuti
            if (!portfolioSection.querySelector('.crypto-chart-card')) {
                portfolioSection.innerHTML += `
                    <div class="crypto-card p-3 mb-3">
                        <h5 class="text-danger">Grafici non disponibili</h5>
                        <p>Non è possibile visualizzare i grafici poiché non sono stati caricati i segnali.</p>
                        <p class="text-muted small">Riprova a caricare i segnali dalla sezione precedente.</p>
                    </div>
                `;
            }
        }
        
        // Nascondi il loader iniziale se è ancora visibile
        const loader = document.getElementById('initial-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    },
    
    // Funzione per riavviare il caricamento dei segnali
    riavviaSegnali: async function() {
        console.log("Tentativo di riavvio segnali");
        
        try {
            this.fallbackActivated = false;
            
            // Pulizia cache per forzare ricaricamento completo
            window.dataCache = {
                signals: null,
                signalsFetchTime: 0,
                charts: {}
            };
            
            // Riprova a inizializzare l'app da zero
            await window.initializeApp();
            
            // Controlla se i segnali sono stati caricati correttamente
            const container = document.getElementById('cryptoSignalsContainer');
            if (container && container.querySelectorAll('.crypto-card').length <= 1) {
                // Nessun segnale caricato, mostra errore
                console.error("Nessun segnale caricato durante il riavvio");
                this.mostraErroriSegnaliHardcoded();
            }
        } catch (error) {
            console.error("Errore durante il riavvio dei segnali:", error);
            this.mostraErroriSegnaliHardcoded();
        }
    },
    
    // Funzione per mostrare segnali hardcoded in caso di errore persistente
    mostraErroriSegnaliHardcoded: function() {
        console.log("Visualizzazione segnali hardcoded");
        
        // Genera manualmente 5 segnali predefiniti
        const segnaliPredefiniti = [
            {
                pair: "BTC/USDT",
                signalType: "BUY",
                confidence: 75,
                entryPrice: "67500.0000",
                targetPrice: "72000.0000", 
                stopLoss: "65000.0000",
                indicators: {
                    patternDetected: "BULLISH_TREND",
                    rsi: 55,
                    macd: "1.5",
                    trendStrength: "2.3"
                }
            },
            {
                pair: "ETH/USDT",
                signalType: "BUY",
                confidence: 70,
                entryPrice: "3250.0000",
                targetPrice: "3500.0000",
                stopLoss: "3100.0000",
                indicators: {
                    patternDetected: "BULLISH_TREND",
                    rsi: 52,
                    macd: "0.8",
                    trendStrength: "1.7"
                }
            },
            {
                pair: "SOL/USDT", 
                signalType: "BUY",
                confidence: 65,
                entryPrice: "155.0000",
                targetPrice: "170.0000", 
                stopLoss: "145.0000",
                indicators: {
                    patternDetected: "BULLISH_BREAKOUT",
                    rsi: 62,
                    macd: "2.1",
                    trendStrength: "3.5"
                }
            },
            {
                pair: "BNB/USDT",
                signalType: "BUY", 
                confidence: 62,
                entryPrice: "555.0000",
                targetPrice: "600.0000",
                stopLoss: "530.0000",
                indicators: {
                    patternDetected: "BULLISH_TREND",
                    rsi: 58,
                    macd: "1.2",
                    trendStrength: "2.1"
                }
            },
            {
                pair: "XRP/USDT",
                signalType: "BUY",
                confidence: 60,
                entryPrice: "0.5150",
                targetPrice: "0.5800",
                stopLoss: "0.4800",
                indicators: {
                    patternDetected: "BULLISH_CONSOLIDATION",
                    rsi: 54,
                    macd: "0.5",
                    trendStrength: "1.8"
                }
            }
        ];
        
        const container = document.getElementById('cryptoSignalsContainer');
        if (!container) return;
        
        // Notifica che questi sono dati fallback
        container.innerHTML = `
            <div class="alert alert-info p-2 mb-3">
                <p class="mb-0 small"><i class="fas fa-info-circle"></i> Visualizzazione di segnali di esempio a causa di problemi con l'API</p>
            </div>
        `;
        
        // Aggiungi i segnali hardcoded
        container.innerHTML += segnaliPredefiniti.map(signal => `
            <div class="crypto-card p-3 mb-2">
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
                <div class="row mt-2">
                    <div class="col-4">
                        <small class="text-muted">Entry Price</small>
                        <p class="mb-0">$${signal.entryPrice}</p>
                    </div>
                    <div class="col-4">
                        <small class="text-muted">Target</small>
                        <p class="mb-0 text-success">$${signal.targetPrice}</p>
                    </div>
                    <div class="col-4">
                        <small class="text-muted">Stop Loss</small>
                        <p class="mb-0 text-danger">$${signal.stopLoss}</p>
                    </div>
                </div>
            </div>
        `).join('');
    },
    
    // Controllo iniziale per verifica errori
    verificaErrori: function() {
        setTimeout(() => {
            const container = document.getElementById('cryptoSignalsContainer');
            if (container) {
                const loadingSpinners = container.querySelectorAll('.crypto-loading-spinner');
                const signalCards = container.querySelectorAll('.crypto-card');
                
                // Se ci sono ancora spinner di caricamento e solo una card (quella di caricamento)
                if (loadingSpinners.length > 0 && signalCards.length <= 1) {
                    console.warn('I segnali non sono stati caricati correttamente dopo 8 secondi');
                    this.mostraErroriSegnaliHardcoded();
                }
            }
        }, 8000);
    }
};

// Esegui controllo errori all'avvio
document.addEventListener('DOMContentLoaded', function() {
    // Esegui il controllo errori con un ritardo
    setTimeout(() => {
        window.cryptoFallback.verificaErrori();
    }, 1000);
});

// Esporta le funzioni di fallback
export default window.cryptoFallback; 