if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('Prickle Service Worker registered:', registration.scope);
      })
      .catch((err) => {
        console.error('Prickle Service Worker registration failed:', err);
      });
  });
}
