document.addEventListener('DOMContentLoaded', () => {
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

  confirmBtn.addEventListener('click', () => {
    const words = inputs.map(i => i.value.trim()).filter(Boolean);
    if (words.length !== 24) return;
    const phrase = words.join(' ');
    console.log('Seed phrase:', phrase);
    alert('Фраза принята');
  });

  createBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
});


