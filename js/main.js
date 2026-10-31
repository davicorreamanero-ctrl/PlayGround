// Ponto de entrada: liga renderizador, áudio, interface e conteúdo jogável.
import { Game, setEvents } from './game-core.js';
import './game-activities.js';
import { EVENTS } from './data.js';

setEvents(EVENTS);
// Acesso de diagnóstico para testes automatizados; não aparece na interface.
window.__sg = { Game };

function boot() {
  try {
    Game.init();
  } catch (err) {
    console.error('Falha ao iniciar o serviço de guarda', err);
    const load = document.getElementById('loading');
    if (load) {
      load.innerHTML = `<div class="load-inner"><h2>NÃO FOI POSSÍVEL INICIAR</h2><p>Recarregue a página para tentar novamente.</p><button class="btn btn-primary" onclick="location.reload()">RECARREGAR</button></div>`;
      load.classList.add('active');
    }
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
