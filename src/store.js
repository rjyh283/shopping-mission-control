const useChrome = typeof chrome !== 'undefined' && !!chrome.storage?.local;
const memStore = new Map();
const listeners = [];

function notify() {
  listeners.forEach(fn => fn());
}

const store = {
  async get(key) {
    if (useChrome) {
      const res = await chrome.storage.local.get(key);
      return res[key];
    }
    return memStore.get(key);
  },

  async set(key, value) {
    if (useChrome) {
      await chrome.storage.local.set({ [key]: value });
    } else {
      memStore.set(key, value);
    }
    notify();
  },

  subscribe(fn) {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i !== -1) listeners.splice(i, 1);
    };
  },
};

export default store;
