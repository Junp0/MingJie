import { useIntl } from '@umijs/max';
import { Button, message, notification } from 'antd';
import defaultSettings from '../config/defaultSettings';

const { pwa } = defaultSettings;
const isHttps = document.location.protocol === 'https:';
const chunkReloadKey = 'mingjie:chunk-reload-at';
const chunkLoadErrorPattern =
  /ChunkLoadError|Loading (?:CSS )?chunk \d+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i;

const getErrorText = (reason: unknown) => {
  if (reason instanceof Error) {
    return `${reason.name}: ${reason.message}`;
  }
  if (typeof reason === 'string') {
    return reason;
  }
  if (reason && typeof reason === 'object' && 'message' in reason) {
    return String(reason.message);
  }
  return '';
};

const reloadForStaleChunk = () => {
  const now = Date.now();
  const lastReloadAt = Number(window.sessionStorage.getItem(chunkReloadKey) ?? 0);
  if (now - lastReloadAt < 60_000) {
    return;
  }

  window.sessionStorage.setItem(chunkReloadKey, String(now));
  window.location.reload();
};

window.addEventListener('error', (event) => {
  const target = event.target;
  const isLocalScriptFailure =
    target instanceof HTMLScriptElement &&
    new URL(target.src, window.location.href).origin === window.location.origin;
  const isLocalStyleFailure =
    target instanceof HTMLLinkElement &&
    target.rel === 'stylesheet' &&
    new URL(target.href, window.location.href).origin === window.location.origin;

  if (
    isLocalScriptFailure ||
    isLocalStyleFailure ||
    chunkLoadErrorPattern.test(event.message)
  ) {
    reloadForStaleChunk();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (chunkLoadErrorPattern.test(getErrorText(event.reason))) {
    reloadForStaleChunk();
  }
});

const clearCache = () => {
  // remove all caches
  if (window.caches) {
    caches
      .keys()
      .then((keys) => {
        keys.forEach((key) => {
          caches.delete(key);
        });
      })
      .catch((e) => console.log(e));
  }
};

// if pwa is true
if (pwa) {
  // Notify user if offline now
  window.addEventListener('sw.offline', () => {
    message.warning(useIntl().formatMessage({ id: 'app.pwa.offline' }));
  });

  // Pop up a prompt on the page asking the user if they want to use the latest version
  window.addEventListener('sw.updated', (event: Event) => {
    const e = event as CustomEvent;
    const reloadSW = async () => {
      // Check if there is sw whose state is waiting in ServiceWorkerRegistration
      // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration
      const worker = e.detail?.waiting;
      if (!worker) {
        return true;
      }
      // Send skip-waiting event to waiting SW with MessageChannel
      await new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (msgEvent) => {
          if (msgEvent.data.error) {
            reject(msgEvent.data.error);
          } else {
            resolve(msgEvent.data);
          }
        };
        worker.postMessage({ type: 'skip-waiting' }, [channel.port2]);
      });

      clearCache();
      window.location.reload();
      return true;
    };
    const key = `open${Date.now()}`;
    const btn = (
      <Button
        type="primary"
        onClick={() => {
          notification.destroy(key);
          reloadSW();
        }}
      >
        {useIntl().formatMessage({ id: 'app.pwa.serviceworker.updated.ok' })}
      </Button>
    );
    notification.open({
      message: useIntl().formatMessage({ id: 'app.pwa.serviceworker.updated' }),
      description: useIntl().formatMessage({
        id: 'app.pwa.serviceworker.updated.hint',
      }),
      btn,
      key,
      onClose: async () => null,
    });
  });
} else if ('serviceWorker' in navigator && isHttps) {
  // unregister service worker
  const { serviceWorker } = navigator;
  if (serviceWorker.getRegistrations) {
    serviceWorker.getRegistrations().then((sws) => {
      sws.forEach((sw) => {
        sw.unregister();
      });
    });
  }
  serviceWorker.getRegistration().then((sw) => {
    if (sw) sw.unregister();
  });

  clearCache();
}
