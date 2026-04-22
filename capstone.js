(function () {
  // NOTE TO IAN: set this password before deploying.
  // Client-side gates are soft protection — if the content is truly sensitive,
  // host it behind real server auth (e.g. a static host with password protection).
  const PASSWORD = 'ResearchAccess26';
  const STORAGE_KEY = 'capstone-unlocked';

  const gate = document.getElementById('gate');
  const content = document.getElementById('capstone-content');
  const form = document.getElementById('gate-form');
  const input = document.getElementById('gate-input');
  const error = document.getElementById('gate-error');

  function unlock() {
    if (gate) gate.style.display = 'none';
    if (content) content.style.display = 'block';
  }

  if (sessionStorage.getItem(STORAGE_KEY) === 'yes') {
    unlock();
    return;
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (input.value === PASSWORD) {
        sessionStorage.setItem(STORAGE_KEY, 'yes');
        error.textContent = '';
        unlock();
      } else {
        error.textContent = 'Incorrect password. Please try again.';
        input.value = '';
        input.focus();
      }
    });
  }
})();
