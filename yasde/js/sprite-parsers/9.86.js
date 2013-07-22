TibiaSpriteParser = function(ab) {
  if (!(ab instanceof ArrayBuffer)) {
    throw new Error('ab is not an ArrayBuffer');
  }
  this.fileArrayBuffer = ab; // Reference to the raw ArrayBuffer of file
  this.ds = new DataStream(this.fileArrayBuffer);
  this.ds.endianness = DataStream.LITTLE_ENDIAN;
}
TibiaSpriteParser.prototype = {};

TibiaSpriteParser.prototype.getNumItems = function () {
  this.ds.seek(4);
  var numSprites = this.ds.readUint32();
  
  return numSprites;
}

TibiaSpriteParser.prototype.getSpritePixels = function(spriteId) {
  //console.time('get item pixels ' + spriteId);
  var pixels = new Array();

  // Get the offset for this sprites pixel data
  var sData = (8 + (spriteId - 1) * 4);
  this.ds.seek(sData);

  var offset = this.ds.readUint32(sData);

  if (offset == 0) return null;
  this.ds.seek(offset);

  // Get the color that should be rendered transparent
  var tColor = this.ds.readUint8Array(3);

  // Get the size of the sprite
  var sSize = this.ds.readUint16();

  if (sSize == 0) return 0;

  var EoS = this.ds.position + sSize;
  while (this.ds.position < EoS) {
    // How many transparent pixels in a row?
    var numT = this.ds.readUint16();

    // Write transparent pixels to pixel array
    for (i = 0; i < numT; i++) {
      pixels.push(tColor[0]);
      pixels.push(tColor[1]);
      pixels.push(tColor[2]);
      pixels.push(255); // transparency
    }

    // How many colored pixels in a row?
    var numC = this.ds.readUint16();
    for (i = 0; i < numC; i++) {
      pixels.push(this.ds.readUint8());
      pixels.push(this.ds.readUint8());
      pixels.push(this.ds.readUint8());
      pixels.push(255); // transparency
    }
  }

  // All trailing pixels are transparent
  if (pixels.length < 4096) {
    for (var i = pixels.length - 1; i < 4096; i+=4) {
      pixels.push(tColor[0]);
      pixels.push(tColor[1]);
      pixels.push(tColor[2]);
      pixels.push(255); // transparency
    }
  }

  //console.timeEnd('get item pixels ' + spriteId);
  return pixels;
}