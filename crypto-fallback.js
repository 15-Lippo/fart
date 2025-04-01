/**
 * crypto-fallback.js
 * Script per gestire errori di caricamento e garantire la visualizzazione dei grafici
 */

(function() {
    // Flag per tracciare i tentativi di ricaricamento
    let ricaricamentoEseguito = false;
    
    // Controllo principale per Chart.js
    function verificaChartJS() {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js non disponibile. Ricaricamento in corso...');
            caricaChartJS();
            return false;
        }
        return true;
    }
    
    // Funzione per caricare Chart.js
    function caricaChartJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js";
            script.onload = function() {
                console.log('Chart.js caricato con successo');
                caricaAnnotationPlugin().then(resolve).catch(reject);
            };
            script.onerror = function() {
                console.error('Errore nel caricamento di Chart.js');
                reject(new Error('Errore nel caricamento di Chart.js'));
            };
            document.head.appendChild(script);
        });
    }
    
    // Funzione per caricare il plugin di annotazione
    function caricaAnnotationPlugin() {
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
    }
    
    // Controlla se i grafici sono stati renderizzati correttamente
    function verificaGrafici() {
        const chartContainers = document.querySelectorAll('.chart-container');
        if (chartContainers.length === 0) return false;
        
        let graficiVisualizzati = false;
        chartContainers.forEach(function(container) {
            const canvas = container.querySelector('canvas');
            if (canvas && canvas.getBoundingClientRect().height > 0) {
                graficiVisualizzati = true;
            }
        });
        
        return graficiVisualizzati;
    }
    
    // Riavvia l'app
    function riavviaApp() {
        if (ricaricamentoEseguito) {
            console.log('Un ricaricamento è già stato eseguito, evito cicli infiniti');
            mostraErroreSegnali();
            return;
        }
        
        ricaricamentoEseguito = true;
        
        if (window.initializeApp) {
            console.log('Riavvio dell\'app in corso...');
            try {
                window.initializeApp();
            } catch (e) {
                console.error('Errore durante il riavvio dell\'app:', e);
                mostraErroreSegnali();
            }
        } else {
            console.error('Funzione initializeApp non disponibile');
            mostraErroreSegnali();
        }
    }
    
    // Mostra un messaggio di errore all'utente invece di riavviare in loop
    function mostraErroreSegnali() {
        const container = document.getElementById('cryptoSignalsContainer');
        if (container) {
            container.innerHTML = `
                <div class="crypto-card p-3 mb-2">
                    <h5 class="text-danger">Errore di caricamento</h5>
                    <p>Non è stato possibile caricare i segnali. Server non disponibile.</p>
                    <button class="btn btn-sm btn-outline-success mt-2" onclick="location.reload()">
                        Riprova
                    </button>
                </div>
            `;
        }
        
        const chartContainer = document.getElementById('portfolioSection');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="crypto-card p-3 mb-3">
                    <h5 class="text-danger">Grafici non disponibili</h5>
                    <p>Non è stato possibile caricare i grafici. Verifica la connessione internet.</p>
                    <button class="btn btn-sm btn-outline-success mt-2" onclick="location.reload()">
                        Riprova
                    </button>
                </div>
            `;
        }
        
        // Nascondi il loader iniziale se è ancora visibile
        const loader = document.getElementById('initial-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }
    
    // Esporta le funzioni
    window.cryptoFallback = {
        verificaChartJS,
        caricaChartJS,
        verificaGrafici,
        riavviaApp,
        mostraErroreSegnali
    };
    
    // Controllo automatico dopo 5 secondi, ma solo una volta
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            if (!ricaricamentoEseguito && !verificaGrafici()) {
                console.warn('I grafici non sono stati renderizzati correttamente. Tentativo unico di recupero...');
                caricaChartJS().then(() => {
                    setTimeout(riavviaApp, 500);
                }).catch(() => {
                    mostraErroreSegnali();
                });
            }
        }, 5000);
    });
})(); 