# otherstore

> Persistent localStorage with Cookie fallback for "Private mode" on iOS devices. Uses JSON to serialize/deserialize data. Supports prefixes. No extra sugar.


## Install

```
$ npm install --save otherstore
```


## Usage

```js
var store = require('otherstore');

store.setPrefix('myapp');
store.set('hello from', { message: 'the other side' });

console.log('hello from', store.get('hello from').message); // hello from the other side
```


## License

MIT © [Max Degterev](http://max.degterev.me)
