// Imperative bridge so non-React code (e.g. axios interceptors) can raise toasts.
// Calls made before the provider mounts are queued and flushed on bind.
let impl = null;
const pending = [];

export function bindNotifier(api) {
  impl = api;
  pending.splice(0).forEach(([method, args]) => api[method](...args));
  return () => {
    if (impl === api) impl = null;
  };
}

const call = (method) => (...args) => (impl ? impl[method](...args) : pending.push([method, args]));

export const toast = {
  success: call('success'),
  error: call('error'),
  warning: call('warning'),
  info: call('info'),
  dismiss: call('dismiss'),
  clear: call('clear')
};
