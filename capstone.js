/* Report request form.
   Replaces the old client-side password gate, which was never real protection:
   the password shipped to every browser in a public repo. Access is now a
   short-lived signed link issued by the Worker in /worker.js. */
(function () {
  var form = document.getElementById('report-form');
  if (!form) return;

  var email = document.getElementById('rf-email');
  var website = document.getElementById('rf-website');
  var submit = document.getElementById('rf-submit');
  var msg = document.getElementById('rf-msg');

  function say(text, state) {
    msg.textContent = text;
    if (state) { msg.setAttribute('data-state', state); }
    else { msg.removeAttribute('data-state'); }
  }

  function looksLikeEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  // On success the form is replaced by the download itself, so the reader
  // never has to go looking for what they just asked for.
  function showDownload(url) {
    var wrap = document.createElement('div');

    var link = document.createElement('a');
    link.className = 'pill';
    link.href = url;
    // Served with an inline disposition so it opens in the browser's PDF
    // viewer; readers can save from there if they want the file.
    link.textContent = 'Open the report (PDF)';
    link.target = '_blank';
    link.rel = 'noopener';

    var note = document.createElement('p');
    note.className = 'fine';
    note.textContent = 'This link is good for 24 hours. Come back any time and enter your email again for a fresh one.';

    wrap.appendChild(link);
    wrap.appendChild(note);
    form.parentNode.replaceChild(wrap, form);
    say('Thanks. Your download is ready.', 'ok');
    link.focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var value = (email.value || '').trim();
    if (!looksLikeEmail(value)) {
      say('That address doesn’t look right. Check it and try again.', 'error');
      email.focus();
      return;
    }

    submit.disabled = true;
    say('One moment…');

    fetch('/api/report-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: value,
        website: website ? website.value : '',
        source: 'capstone'
      })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok && result.data && result.data.url) {
          showDownload(result.data.url);
          return;
        }
        submit.disabled = false;
        say(
          (result.data && result.data.error) ||
            'Something went wrong on our end. Try again in a moment, or email ian.shannon@duke.edu.',
          'error'
        );
      })
      .catch(function () {
        submit.disabled = false;
        say('Couldn’t reach the server. Check your connection and try again.', 'error');
      });
  });
})();
