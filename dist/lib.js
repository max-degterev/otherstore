"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * Otherstore localStorage wrapper
 *
 * @author Max Degterev <max@degterev.me>
 */

var COOKIE_SETTING = {
  localStorage: "; expires=Tue, 19 Jan 2038 03:14:07 GMT; path=/",
  sessionStorage: "; path=/"
};

var KEY_VAULT = "__STORAGE_KEY_VAULT__";

var storageType = 'localStorage';
var storagePrefix = null;

// Utility functions
var extend = function extend(obj, otherObj) {
  for (var prop in otherObj) {
    if (otherObj.hasOwnProperty(prop)) {
      obj[prop] = otherObj[prop];
    }
  }
};

var getKey = function getKey(key) {
  if (!storagePrefix) return key;
  return storagePrefix + ":" + key;
};

var deserializeData = function deserializeData(data) {
  if (!data) return null; // iOS fails to parse empty strings with error: "SyntaxError: JSON Parse error: Unexpected EOF"
  return JSON.parse(data);
};

var serializeData = function serializeData(data) {
  return JSON.stringify(data);
};

// Adapter implementations
var storageAdapter = {
  getKeyVault: function getKeyVault() {
    var key = getKey(KEY_VAULT);
    var keyVault = deserializeData(this.get(key)) || [];

    return keyVault;
  },
  setKeyVault: function setKeyVault(value) {
    var key = getKey(KEY_VAULT);

    if (value.length) {
      this.set(key, serializeData(value));
    } else {
      this.remove(key);
    }

    return true;
  },

  storeKey: function storeKey(newKey) {
    var keyVault = this.getKeyVault();

    // already present
    if (keyVault.indexOf(newKey) !== -1) return true;

    keyVault.push(newKey);

    return this.setKeyVault(keyVault);
  },

  removeKey: function removeKey(oldKey) {
    var keyVault = this.getKeyVault();

    keyVault.splice(keyVault.indexOf(oldKey), 1);

    return this.setKeyVault(keyVault);
  }
};

var browserStorageAdapter = {
  get: function get(key) {
    return window[storageType].getItem(key);
  },

  set: function set(key, value) {
    window[storageType].setItem(key, value);
    return true;
  },

  remove: function remove(key) {
    window[storageType].removeItem(key);
    return true;
  }
};

var cookieStorageAdapter = {
  get: function get(key) {
    var escapedKey = escape(key).replace(/[\-\.\+\*]/g, "\\$&");
    var replaceRegex = new RegExp("(?:^|.*;\\s*)" + escapedKey + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*");
    var cookieValue = document.cookie.replace(replaceRegex, "$1");

    return unescape(cookieValue);
  },

  set: function set(key, value) {
    document.cookie = escape(key) + "=" + escape(value) + COOKIE_SETTING[storageType];
    return true;
  },

  remove: function remove(key) {
    document.cookie = escape(key) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    return true;
  }
};

// localStorage support detection
var isStorageAvailable = function () {
  try {
    var supported = storageType in window && window[storageType] !== null;

    // When Safari (OS X or iOS) is in private browsing mode, it appears as though localStorage
    // is available, but trying to call .setItem throws an exception:
    // "QUOTA_EXCEEDED_ERR: DOM Exception 22: An attempt was made to add something to storage
    // that exceeded the quota."
    var key = getKey('__' + Math.round(Math.random() * 1e7));

    if (supported) {
      window[storageType].setItem(key, '');
      window[storageType].removeItem(key);
    }

    return supported;
  } catch (e) {
    return false;
  }
}();

if (isStorageAvailable) {
  extend(storageAdapter, browserStorageAdapter);
} else {
  extend(storageAdapter, cookieStorageAdapter);
}

// API implementation
var OtherStore = {
  setPrefix: function setPrefix(prefix) {
    return storagePrefix = prefix;
  },

  get: function get(_key) {
    if (!_key) return null;
    var key = getKey(_key);

    return deserializeData(storageAdapter.get(key));
  },

  set: function set(_key, value) {
    if (!_key) return null;
    var key = getKey(_key);

    storageAdapter.storeKey(_key);
    return storageAdapter.set(key, serializeData(value));
  },

  remove: function remove(_key) {
    if (!_key) return true;

    var key = getKey(_key);
    storageAdapter.removeKey(_key);

    storageAdapter.remove(key);
  },

  has: function has(_key) {
    if (!_key) return false;
    var key = getKey(_key);
    return !!storageAdapter.get(key);
  },

  // Better to have this, than just length. Also easier to implement
  keys: function keys() {
    return storageAdapter.getKeyVault();
  },

  key: function key(at) {
    return undefined.keys()[at];
  },

  clear: function clear() {
    var keyVault = storageAdapter.getKeyVault();

    keyVault.forEach(function (_key) {
      storageAdapter.remove(getKey(_key));
    });

    storageAdapter.setKeyVault([]);
    return true;
  }
};

exports.default = OtherStore;