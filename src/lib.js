/**
 * Otherstore localStorage wrapper
 *
 * @author Max Degterev <max@degterev.me>
 */

const COOKIE_SETTING = {
  localStorage: "; expires=Tue, 19 Jan 2038 03:14:07 GMT; path=/",
  sessionStorage: "; path=/"
};

const KEY_VAULT = "__STORAGE_KEY_VAULT__";

let storageType = 'localStorage';
let storagePrefix = null;


// Utility functions
let extend = function(obj, otherObj) {
  for (let prop in otherObj) {
    if (otherObj.hasOwnProperty(prop)) {
      obj[prop] = otherObj[prop];
    }
  }
};

let getKey = function(key) {
  if (!storagePrefix) return key;
  return `${storagePrefix}:${key}`;
};

let deserializeData = function(data) {
  if (!data) return null; // iOS fails to parse empty strings with error: "SyntaxError: JSON Parse error: Unexpected EOF"
  return JSON.parse(data);
};

let serializeData = function(data) {
  return JSON.stringify(data);
};


// Adapter implementations
let storageAdapter = {
  getKeyVault: function() {
    let key = getKey(KEY_VAULT);
    let keyVault = deserializeData(this.get(key)) || [];

    return keyVault;
  },
  setKeyVault: function(value) {
    let key = getKey(KEY_VAULT);

    if (value.length) {
      this.set(key, serializeData(value));
    }
    else {
      this.remove(key);
    }

    return true;
  },

  storeKey: function(newKey) {
    let keyVault = this.getKeyVault();

    // already present
    if (keyVault.indexOf(newKey) !== -1) return true;

    keyVault.push(newKey);

    return this.setKeyVault(keyVault);
  },

  removeKey: function(oldKey) {
    let keyVault = this.getKeyVault();

    keyVault.splice(keyVault.indexOf(oldKey), 1);

    return this.setKeyVault(keyVault);
  }
};

let browserStorageAdapter = {
  get: function(key) {
    return window[storageType].getItem(key);
  },

  set: function(key, value) {
    window[storageType].setItem(key, value);
    return true;
  },

  remove: function(key) {
    window[storageType].removeItem(key);
    return true;
  }
};

let cookieStorageAdapter = {
  get: function(key) {
    let escapedKey = escape(key).replace(/[\-\.\+\*]/g, "\\$&");
    let replaceRegex = new RegExp("(?:^|.*;\\s*)" + escapedKey + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*");
    let cookieValue = document.cookie.replace(replaceRegex, "$1");

    return unescape(cookieValue);
  },

  set: function(key, value) {
    document.cookie = escape(key) + "=" + escape(value) + COOKIE_SETTING[storageType];
    return true;
  },

  remove: function(key) {
    document.cookie = escape(key) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    return true;
  }
};


// localStorage support detection
let isStorageAvailable = (function() {
  try {
    let supported = (storageType in window && window[storageType] !== null);

    // When Safari (OS X or iOS) is in private browsing mode, it appears as though localStorage
    // is available, but trying to call .setItem throws an exception:
    // "QUOTA_EXCEEDED_ERR: DOM Exception 22: An attempt was made to add something to storage
    // that exceeded the quota."
    let key = getKey('__' + Math.round(Math.random() * 1e7));

    if (supported) {
      window[storageType].setItem(key, '');
      window[storageType].removeItem(key);
    }

    return supported;
  } catch (e) {
    return false;
  }
}());

if (isStorageAvailable) {
  extend(storageAdapter, browserStorageAdapter);
}
else {
  extend(storageAdapter, cookieStorageAdapter);
}


// API implementation
let OtherStore = {
  setPrefix: (prefix) => {
    return storagePrefix = prefix;
  },

  get: (_key) => {
    if (!_key) return null;
    let key = getKey(_key);

    return deserializeData(storageAdapter.get(key));
  },

  set: (_key, value) => {
    if (!_key) return null;
    let key = getKey(_key);

    storageAdapter.storeKey(_key);
    return storageAdapter.set(key, serializeData(value));
  },

  remove: (_key) => {
    if (!_key) return true;

    let key = getKey(_key);
    storageAdapter.removeKey(_key);

    storageAdapter.remove(key);
  },

  has: (_key) => {
    if (!_key) return false;
    let key = getKey(_key);
    return !!storageAdapter.get(key);
  },

  // Better to have this, than just length. Also easier to implement
  keys: () => {
    return storageAdapter.getKeyVault();
  },

  key: (at) => {
    return this.keys()[at];
  },

  clear: () => {
    let keyVault = storageAdapter.getKeyVault();

    keyVault.forEach((_key) => {
      storageAdapter.remove(getKey(_key));
    });

    storageAdapter.setKeyVault([]);
    return true;
  },
};

export default OtherStore;
