// Load the 3D race only when the device can create a WebGL2 context.
// Keep failure states accessible instead of leaving players with an empty canvas.
const overlay = document.querySelector<HTMLElement>('#start-overlay');
const startButton = document.querySelector<HTMLButtonElement>('#start-btn');

function showStartupProblem(message: string): void {
  if (!overlay) return;
  overlay.classList.add('active');
  if (startButton) {
    startButton.disabled = true;
    startButton.setAttribute('aria-disabled', 'true');
  }
  let notice = document.querySelector<HTMLElement>('#startup-problem');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'startup-problem';
    notice.setAttribute('role', 'alert');
    notice.style.cssText = 'margin-top:1.2rem;padding:1rem;border:1px solid #f59e0b;border-radius:12px;background:#2d1d09;color:#fff1c2;line-height:1.5';
    overlay.querySelector('.hero-panel')?.appendChild(notice);
  }
  notice.replaceChildren();
  const paragraph = document.createElement('p');
  paragraph.textContent = message;
  notice.appendChild(paragraph);
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'RETRY LOADING';
  retry.addEventListener('click', () => window.location.reload());
  notice.appendChild(retry);
}

function supportsWebGL2(): boolean {
  try {
    const probe = document.createElement('canvas');
    return !!probe.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
  } catch {
    return false;
  }
}

const raceCanvas = document.querySelector<HTMLCanvasElement>('#game');
raceCanvas?.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  showStartupProblem('The graphics device lost its WebGL connection. Save other work, then retry the race.');
});

if (!supportsWebGL2()) {
  showStartupProblem('DVILR GP needs WebGL2 hardware acceleration. Enable graphics acceleration in your browser, update your GPU driver, or try another device.');
} else {
  void import('./main').catch((error: unknown) => {
    console.error('DVILR GP could not initialize:', error);
    showStartupProblem('The race could not start. Try reloading the page. If the issue persists, check the browser console and report the error.');
  });
}
