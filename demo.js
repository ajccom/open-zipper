"use strict"

;(function (win, isDebug, undefined) {
  var demo = (function () {
    var log = function (s) {
      isDebug ? (window.console ? console.log(s) : null) : null;
    };
    
    var errorReporter = (function () {
      if (!isDebug) {return}
      var div = document.createElement('div');
      div.className = 'error-reporter';
      window.onerror = function (msg, url, line) {
        div.innerHTML = '<div class="item">' + msg + ' ' + 'line: ' + line + '</div>' + div.innerHTML;
      };
      return {
        ini: function () {
          document.body.appendChild(div);
        },
        hide: function () {
          div.style.display = 'none';
        }
      };
    }());
    
    var isMobile = (function () {
      var ua = navigator.userAgent,
          result = false;
      if (ua.match(/Android/i) || ua.match(/webOS/i) || ua.match(/iPhone/i) || ua.match(/iPad/i) || ua.match(/iPod/i) || ua.match(/BlackBerry/i) || ua.match(/Windows Phone/i)) {
        result = true;
      }
      return result;
    }());
    
    var event = {
      start: isMobile ? 'touchstart' : 'mousedown',
      move: isMobile ? 'touchmove' : 'mousemove',
      end: isMobile ? 'touchend' : 'mouseup'
    };
    
    var loader = {
      count: 0,
      dir: 'images/',
      list: ['hand.png', 'canvas.jpg'],
      load: function () {
        var name = '',
            img = null,
            that = this;
        this.total = this.list.length;
        while (this.list.length) {
          name = this.list.shift();
          img = document.createElement('img');
          img.src = this.dir + name;
          (function (name) {
            img.addEventListener('load', function () {
              that.count++;
              helper.write('load images: ' + name + ' ' + Math.ceil(that.count / that.total * 100) + '%');
              if (that.count === that.total) {
                that.isComplete = true;
                helper.write('load images complete');
              }
            });
          }(name));
        }
      },
      ini: function () {
        this.load();
      }
    };
    
    var resize = function () {
      demo.canvas.width = demo.canvas.clientWidth;
      demo.shadowCanvas.width = demo.canvas.clientWidth;
      demo.canvas.height = demo.shadowCanvas.height = demo.canvas.clientHeight;
    };
    
    var bind = function () {
      win.addEventListener('resize', function () {
        resize();
      });
      
      demo.canvas.addEventListener(event.move, function (e) {
        if (e.preventDefault) {e.preventDefault();}
        if (demo.isTouched && !demo.isComplete) {
          var that = this;
          if (!demo.isWait) {
            demo.isWait = true;
            setTimeout(function () {
              var offset = that.getBoundingClientRect();
              var x = (typeof e.clientX === 'undefined' ? e.touches[0].pageX : e.clientX) - (offset.x || offset.left),
                  y = (typeof e.clientY === 'undefined' ? e.touches[0].pageY : e.clientY) - (offset.y || offset.top),
                  cy = demo.currentY;
              helper.write((typeof e.clientX === 'undefined' ? e.touches[0].pageX : e.clientX));
              helper.write((typeof e.clientY === 'undefined' ? e.touches[0].pageY : e.clientY));
              demo.isWait = false;
              if (Math.abs(that.width / 2 - x) < 40 && (Math.abs(cy - y) < 20 || demo.isHit)) {
                demo.isHit = true;
                draw(y);
                if (Math.abs(demo.canvas.height - y) < 200) {
                  complete(y);
                }
              }
            }, 40);
          }
        }
      });
      
      demo.canvas.addEventListener(event.start, function (e) {
        demo.isTouched = true;
        demo.isHit = false;
        helper.write('demo touched: ' + demo.isTouched);
      });
      
      document.addEventListener(event.end, function (e) {
        demo.isTouched = false;
        demo.isHit = false;
        helper.write('demo touched: ' + demo.isTouched);
      });
      
    };
    
    var draw = function (distance) {
      distance = distance || 0;
      demo.currentY = distance;
      if (loader.isComplete && !demo.isComplete) {
        var img = new Image(),
            ctx = demo.ctx,
            shadowCtx = demo.shadowCtx,
            sw = demo.shadowCanvas.width,
            w = demo.canvas.width,
            h = demo.canvas.height;
        img.src = 'images/canvas.jpg';
        
        shadowCtx.drawImage(img, 0, 0, sw, h);
        var imageData = _getImageData(distance);
        shadowCtx.clearRect(0, 0, sw, h);
        shadowCtx.putImageData(imageData, 0, 0);
        
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(demo.shadowCanvas, 0, 0);
				ctx.translate(w, 0);
				ctx.scale(-1, 1);
        ctx.drawImage(demo.shadowCanvas, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        img = new Image();
        img.src = 'images/hand.png';
        ctx.drawImage(img, sw, distance - 10, sw, 200);
        
      } else {
        setTimeout(function () {
          draw();
        }, 100);
      }
    };
    
    var _getImageData = function (distance) {
      var data = demo.shadowCtx.getImageData(0, 0, demo.shadowCanvas.width, demo.shadowCanvas.height),
          copy = demo.shadowCtx.getImageData(0, 0, demo.shadowCanvas.width, demo.shadowCanvas.height).data;
      if (!distance) {
        return data;
      } else {
        //helper.write(distance);
        //how to descript it in javascript?
        //console.time('handle image data');
        //设置一个算子，在高度小于distance的条件下，取出该高度下的宽度
        //压缩原像素在获取的宽度内
        //超出宽度的设置透明
        //目测算子: 1 / 2000 * y^2 - 1
        var i = 0,
            l = data.width * data.height,
            d = data.data,
            currentY = 0,
            currentX = 0,
            idx = 0,
            w = 0,
            p = 0,
            savedHeight = 0;
        for (i = 0; i < l; i++) {
          currentX = i % data.width;
          currentY = Math.floor(i / data.width);
          idx = i * 4;
          if (currentY < distance) {
            if (currentY !== savedHeight) {
              w = data.width - 1 / 3000 * (distance - currentY) * (distance - currentY) - 1;
              savedHeight = currentY;
            }
            if (currentX < w) {
              //p = Math.floor((currentX / w * data.width)) * currentY * 4;
              p = (Math.floor((currentX / w * data.width)) + (currentY - 1) * data.width) * 4;
              d[idx] = copy[p];
              d[idx + 1] = copy[p + 1];
              d[idx + 2] = copy[p + 2];
              d[idx + 3] = copy[p + 3];
            } else {
              d[idx] = 0;
              d[idx + 1] = 0;
              d[idx + 2] = 0;
              d[idx + 3] = 0;
            }
          }
        }
        
        //console.timeEnd('handle image data');
        return data;
      }
    };
    
    var complete = function (distance) {
      demo.isComplete = true;
      demo.canvas.removeEventListener(event.move, function () {}, false);
      helper.write('user operate end');
      demo.completeTop = distance;
      completeAnimate(50, 25, demo.canvas.width / 2, distance, 500);
    };
    
    var completeAnimate = function (left, top, currentLeft, currentTop, time) {
      var interval = 50;
      if (!demo.completeTimer) {demo.completeTimer = 0;}
      if (demo.completeTimer >= time) {helper.write('complete animation end'); return}
      setTimeout(function () {
      
        var img = new Image(),
            ctx = demo.ctx,
            shadowCtx = demo.shadowCtx,
            sw = demo.shadowCanvas.width,
            w = demo.canvas.width,
            h = demo.canvas.height,
            steps = time / interval,
            distance = 0;
        demo.currentY = demo.currentY + (h - demo.completeTop) / steps;
        currentLeft = currentLeft + left / steps;
        currentTop = currentTop + top / steps;
        distance = demo.currentY;
        img.src = 'images/canvas.jpg';
        shadowCtx.drawImage(img, 0, 0, sw, h);
        var imageData = _getImageData(distance);
        shadowCtx.clearRect(0, 0, sw, h);
        shadowCtx.putImageData(imageData, 0, 0);
        
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(demo.shadowCanvas, 0, 0);
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(demo.shadowCanvas, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        img = new Image();
        img.src = 'images/hand.png';
        ctx.drawImage(img, currentLeft, currentTop, sw, 200);
        
        demo.completeTimer += interval;
        completeAnimate(left, top, currentLeft, currentTop, time);
      }, interval);
    };
    
    var helper = {
      clear: function () {
        this.box.innerHTML = '';
      },
      write: function (something) {
        var text = '';
        if (typeof something === 'string' || typeof something === 'number') {
          text = something;
        } else if (typeof something === 'function') {
          text = something.toString();
        } else if (typeof something === 'object') {
          text = JSON.stringify(something);
        }
        this.box.innerHTML = '<p>' + text + '</p>' + this.box.innerHTML;
      },
      ini: function () {
        var showBox = document.createElement('div');
        showBox.className = 'help-show-box';
        this.box = showBox;
        if (isDebug) {document.body.appendChild(showBox)};
      }
    };
    
    return {
      isMobile: isMobile,
      loader: loader,
      helper: helper,
      errorReporter: errorReporter,
      ini: function () {
        this.loader.ini();
        this.helper.ini();
        this.errorReporter.ini();
        this.canvas = document.getElementById('ctx');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.canvas.clientWidth;//reset ctx width
        this.canvas.height = this.canvas.clientHeight;
        this.shadowCanvas = document.createElement('canvas');
        this.shadowCtx = this.shadowCanvas.getContext('2d');
        this.shadowCanvas.width = this.canvas.clientWidth / 2;
        this.shadowCanvas.height = this.canvas.clientHeight;
        bind();
        draw();
      }
    }
  }());


  if (isDebug) {
    win.demo = demo;
  }
  
  win.addEventListener('load', function () {
    demo.ini();
    demo.helper.write('isMobile: ' + demo.isMobile)
  });
  
}(window, true));