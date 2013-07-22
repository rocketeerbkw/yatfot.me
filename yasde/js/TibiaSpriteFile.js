
TibiaSpriteFile = function(pLibrary) {
  if (!pLibrary) {
    throw new Error('Need pLibrary');
  }
  this.promise = pLibrary; // Promises/A+ library
  this.file = null; // Raw file object
  this.fileArrayBuffer = null; // Reference to the raw ArrayBuffer of file
  this.tibiaVersion = null; // What version of spr do we have?
  this.header = null; // Header of spr file
  this.parser = null;
  this.canvas = null;
  this.canvasContext = null;
  this.canvasImageData = null;
  this.nullDataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgBAMAAACBVGfHAAAAG1BMVEX///8AAAA/Pz+fn5+/v7/f398fHx9fX19/f3+hWoJSAAAAZUlEQVQokWNgGNaAyYBBJSiAVZXJgYFBBSTAKMqQHOjAKspowMAgDBZIRxcwDEAT8FBAE3BIQRcwEw50YEEWYBJmU2VPYGwNZZAIDQAJsAizJIo5MAoKGggKCkNdxxpA18AgBwAAQGgQGWNmpEwAAAAASUVORK5CYII=';
  this.transparentDataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgBAMAAACBVGfHAAAAG1BMVEX///8AAAC/v7+fn58/Pz/f399/f39fX18fHx9oMRHmAAAAKklEQVQokWNgGNSAyRgEkARYBEEgACHAVl4iWF4egKyJTQLNlOEkQGcAAN1aBXG+EnVBAAAAAElFTkSuQmCC';
  this.versionMatrix = {
    'header': {'version': 'xx.xx', 'protocolHandler': 'xx.xx'},
    '0x5170e96f': {'version': '9.86', 'protocolHandler': '9.86'},
  };
}
TibiaSpriteFile.prototype = {};

TibiaSpriteFile.prototype.setFile = function(file) {
  if (!(file instanceof File)) {
    console.error('file is not a File');
    return;
  }

  this.file = file;
  return this;
}

TibiaSpriteFile.prototype.setFileArrayBuffer = function(ab) {
  if (!(ab instanceof ArrayBuffer)) {
    console.error('ab is not an ArrayBuffer!');
    return;
  }

  this.fileArrayBuffer = ab;
  return this;
}

TibiaSpriteFile.prototype.parseHeader = function() {
  console.time('parseHeader');
  log('reading header...');
  var deferred = this.promise.defer();

  var fileReader = new FileReader();

  fileReader.onload = (function(that) {
    return function(e) {
      var ds = new DataStream(e.target.result);
      var headerRaw = ds.readUint8Array(4);
      var headerHex = '0x';
      for (i = 3; i >= 0; i--) {
        headerHex = headerHex + headerRaw[i].toString(16);
      }

      that.header = headerHex;
      console.timeEnd('parseHeader');
      deferred.resolve(that.header);
    }
  })(this);

  var slice = this.file.slice(0, 4);
  fileReader.readAsArrayBuffer(slice);

  return deferred.promise;
}

TibiaSpriteFile.prototype.loadFullParser = function() {
  var deferred = this.promise.defer();

  if (this.versionMatrix[this.header]) {
    log('detected ' + this.versionMatrix[this.header].version);
    log('loading full parser...');
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = 'js/sprite-parsers/' + this.versionMatrix[this.header].protocolHandler + '.js';
    script.onload = function() { deferred.resolve() };
    var s = document.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(script, s);
  }

  return deferred.promise;
}

TibiaSpriteFile.prototype.loadFullFile = function() {
  log('loading into memory...');
  console.time('load full file');
  var deferred = Q.defer();

  var fileReader = new FileReader();

  fileReader.onload = (function(that) {
    return function(e) {
      that.fileArrayBuffer = e.target.result;
      console.timeEnd('load full file');
      deferred.resolve();
    }
  })(this);

  fileReader.readAsArrayBuffer(this.file);

  return deferred.promise;
}

TibiaSpriteFile.prototype.spriteAsImage = function(spriteId) {
  if (!this.canvas) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 32;
    this.canvas.height = 32;
    this.canvasContext = this.canvas.getContext('2d');
    this.canvasImageData = this.canvasContext.createImageData(32, 32);
  }

  var pixels = this.parser.getSpritePixels(spriteId);

  // Null image
  if (pixels == null) {
    return this.nullDataURL;
  }

  // Full transparent image
  if (pixels.length == 0) {
    return this.transparentDataURL;
  }

  for (var i = 0; i < pixels.length; i++) {
    this.canvasImageData.data[i] = pixels[i];
  }

  // Write our pixel data to canvas
  this.canvasContext.putImageData(this.canvasImageData, 0, 0);
  return this.canvas.toDataURL();
}

TibiaSpriteFile.prototype.renderImages = function(from, to, parent) {
  console.time('render ' + from + '-' + to);
  log('rendering sprites ' + from + ' to ' + to);
  var imgs = document.createElement('span');
  imgs.id = 'f' + from + 't' + to;

  for (var i = from; i <= to; i++) {
    var img = document.createElement('img');
    img.id = 's' + i;
    img.width = '32';
    img.height = '32';
    img.src = this.spriteAsImage(i);
    imgs.appendChild(img);
  }

  parent.appendChild(imgs);
  console.timeEnd('render ' + from + '-' + to);
}

TibiaSpriteFile.prototype.renderAllImages = function(atATime, parent) {
  console.time('render all');
  var totalSprites = this.parser.getNumItems();
  var lastSprite = 0;
  console.log(totalSprites);

  while (lastSprite < 10000) {
    this.renderImages(lastSprite+1, lastSprite + atATime, parent);
    log((lastSprite + 1) + ' ' + (lastSprite + atATime))
    lastSprite += atATime;
  }
  console.timeEnd('render all');
}

TibiaSpriteFile.prototype.renderAllTimeout = function(atATime, parent, last) {
  var last = last || 0;
  var that = this;

  //if (last > this.parser.getNumItems()) return;
  if (last > 10000) return;

  setTimeout(function() {
    that.renderImages(last + 1, last + atATime, parent);
    that.renderAllTimeout(atATime, parent, last + atATime);
  }, 50);
}
