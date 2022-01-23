var __buf = new DataView(new ArrayBuffer(8));

function Writer(littleEndian) {
  this._e = littleEndian;
  this.reset();
  return this;
}

Writer.prototype = {
  writer: true,
  reset: function () {
    this._b = [];
    this._o = 0;
  },
  setUint8: function (a) {
    if (a >= 0 && a < 256) this._b.push(a);
    return this;
  },
  setInt8: function (a) {
    if (a >= -128 && a < 128) this._b.push(a);
    return this;
  },
  setUint16: function (a) {
    __buf.setUint16(0, a, this._e);
    this._move(2);
    return this;
  },
  setInt16: function (a) {
    __buf.setInt16(0, a, this._e);
    this._move(2);
    return this;
  },
  setUint32: function (a) {
    __buf.setUint32(0, a, this._e);
    this._move(4);
    return this;
  },
  setInt32: function (a) {
    __buf.setInt32(0, a, this._e);
    this._move(4);
    return this;
  },
  setFloat32: function (a) {
    __buf.setFloat32(0, a, this._e);
    this._move(4);
    return this;
  },
  setFloat64: function (a) {
    __buf.setFloat64(0, a, this._e);
    this._move(8);
    return this;
  },
  _move: function (b) {
    for (var i = 0; i < b; i++) this._b.push(__buf.getUint8(i));
  },
  setStringUTF8: function (s) {
    var bytesStr = unescape(encodeURIComponent(s));
    for (var i = 0, l = bytesStr.length; i < l; i++) this._b.push(bytesStr.charCodeAt(i));
    this._b.push(0);
    return this;
  },
  setStringZeroUtf8: function (s) {
    this.setStringUTF8(s);
    this.setUint8(0);
  },
  build: function () {
    return new Uint8Array(this._b);
  },
};

function Reader(view, offset, littleEndian) {
  this._e = littleEndian;
  if (view) this.repurpose(view, offset);
}

Reader.prototype = {
  reader: true,
  repurpose: function (view, offset) {
    this.view = view;
    this._o = offset || 0;
  },
  getUint8: function () {
    return this.view.getUint8(this._o++, this._e);
  },
  getInt8: function () {
    return this.view.getInt8(this._o++, this._e);
  },
  getUint16: function () {
    return this.view.getUint16((this._o += 2) - 2, this._e);
  },
  getInt16: function () {
    return this.view.getInt16((this._o += 2) - 2, this._e);
  },
  getUint32: function () {
    return this.view.getUint32((this._o += 4) - 4, this._e);
  },
  getInt32: function () {
    return this.view.getInt32((this._o += 4) - 4, this._e);
  },
  getFloat32: function () {
    return this.view.getFloat32((this._o += 4) - 4, this._e);
  },
  getFloat64: function () {
    return this.view.getFloat64((this._o += 8) - 8, this._e);
  },
  getStringUTF8: function () {
    var s = "",
      b;
    while ((b = this.view.getUint8(this._o++)) !== 0) s += String.fromCharCode(b);

    return decodeURIComponent(escape(s));
  },
};

module.exports = { Writer, Reader };

window.Writer = Writer;
window.Reader = Reader;
