/* NUVQR — minimal QR Code generator (model 2, byte mode, EC level M, versions 1-10).
   window.NUVQR.make(text) -> {size, modules:[[bool]]}
   window.NUVQR.path(text) -> {size, d}  (SVG path data, 1 unit per module) */
(function(){
  var EXP = new Array(512), LOG = new Array(256);
  (function(){ var x=1; for(var i=0;i<255;i++){ EXP[i]=x; LOG[x]=i; x<<=1; if(x&0x100) x^=0x11d; } for(var j=255;j<512;j++) EXP[j]=EXP[j-255]; })();
  function gmul(a,b){ return (!a||!b) ? 0 : EXP[LOG[a]+LOG[b]]; }
  function polyMul(a,b){ var r=new Array(a.length+b.length-1); for(var i=0;i<r.length;i++) r[i]=0;
    for(var x=0;x<a.length;x++) for(var y=0;y<b.length;y++) r[x+y]^=gmul(a[x],b[y]); return r; }
  function rsPoly(deg){ var p=[1]; for(var i=0;i<deg;i++) p=polyMul(p,[1,EXP[i]]); return p; }
  function rsEncode(data, ecLen){
    var gen=rsPoly(ecLen), res=new Array(ecLen); for(var i=0;i<ecLen;i++) res[i]=0;
    for(var k=0;k<data.length;k++){
      var factor = data[k]^res[0];
      res.shift(); res.push(0);
      for(var j=0;j<ecLen;j++) res[j]^=gmul(gen[j+1],factor);
    }
    return res;
  }

  /* tables, index = version. M is preferred; L is the higher-capacity fallback. */
  var LEVELS = {
    M: { bits:0,
      ecpb:   [0,10,16,26,18,24,16,18,22,22,26],
      blocks: [0,[16],[28],[44],[32,32],[43,43],[27,27,27,27],[31,31,31,31],[38,38,39,39],[36,36,36,37,37],[43,43,43,43,44]] },
    L: { bits:1,
      ecpb:   [0,7,10,15,20,26,18,20,24,30,18],
      blocks: [0,[19],[34],[55],[80],[108],[68,68],[78,78],[97,97],[116,116],[68,68,69,69]] }
  };
  var ALIGN   = [null,[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50]];
  var VERBITS = [0,0,0,0,0,0,0,0x07C94,0x085BC,0x09A99,0x0A4D3];

  function utf8(str){
    var out=[], s=encodeURIComponent(str);
    for(var i=0;i<s.length;i++){
      if(s[i]==='%'){ out.push(parseInt(s.substr(i+1,2),16)); i+=2; }
      else out.push(s.charCodeAt(i));
    }
    return out;
  }

  function make(text, level){
    var bytes = utf8(text);
    if(!level){
      var fits = LEVELS.M.blocks[10].reduce(function(a,b){return a+b;},0) - 3 >= bytes.length;
      level = fits ? 'M' : 'L';
    }
    var LV = LEVELS[level] || LEVELS.M;
    var ECPB = LV.ecpb, BLOCKS = LV.blocks;
    var version = 1, dataCw = 0, lenBits = 8;
    for(; version<=10; version++){
      dataCw = BLOCKS[version].reduce(function(a,b){return a+b;},0);
      lenBits = version>=10 ? 16 : 8;
      if(dataCw*8 >= 4 + lenBits + bytes.length*8) break;
    }
    if(version>10) throw new Error('NUVQR: payload too long');

    /* --- bit stream --- */
    var bits=[];
    function push(val,len){ for(var i=len-1;i>=0;i--) bits.push((val>>>i)&1); }
    push(4,4); push(bytes.length,lenBits);
    for(var i=0;i<bytes.length;i++) push(bytes[i],8);
    var cap = dataCw*8;
    for(var t=0;t<4 && bits.length<cap;t++) bits.push(0);
    while(bits.length%8) bits.push(0);
    var pad=[0xEC,0x11], pi=0;
    while(bits.length<cap){ push(pad[pi++%2],8); }

    var dataBytes=[]; for(var b=0;b<bits.length;b+=8){ var v=0; for(var k=0;k<8;k++) v=(v<<1)|bits[b+k]; dataBytes.push(v); }

    /* --- blocks + interleave --- */
    var sizes=BLOCKS[version], ecLen=ECPB[version], dBlocks=[], eBlocks=[], off=0;
    for(var s=0;s<sizes.length;s++){
      var chunk=dataBytes.slice(off,off+sizes[s]); off+=sizes[s];
      dBlocks.push(chunk); eBlocks.push(rsEncode(chunk,ecLen));
    }
    var maxLen=Math.max.apply(null,sizes), final=[];
    for(var c=0;c<maxLen;c++) for(var q=0;q<dBlocks.length;q++) if(c<dBlocks[q].length) final.push(dBlocks[q][c]);
    for(var e=0;e<ecLen;e++) for(var r=0;r<eBlocks.length;r++) final.push(eBlocks[r][e]);

    /* --- matrix --- */
    var size = version*4+17;
    var mod=[], fn=[];
    for(var y=0;y<size;y++){ mod.push(new Array(size).fill(0)); fn.push(new Array(size).fill(false)); }
    function set(x,y,dark,isFn){ if(x<0||y<0||x>=size||y>=size) return; mod[y][x]=dark?1:0; if(isFn) fn[y][x]=true; }

    for(var i2=0;i2<size;i2++){ set(i2,6,i2%2===0,true); set(6,i2,i2%2===0,true); }
    function finder(cx,cy){
      for(var dy=-4;dy<=4;dy++) for(var dx=-4;dx<=4;dx++){
        var d=Math.max(Math.abs(dx),Math.abs(dy));
        set(cx+dx,cy+dy,(d!==2&&d!==4),true);
      }
    }
    finder(3,3); finder(size-4,3); finder(3,size-4);
    var ap=ALIGN[version];
    for(var a1=0;a1<ap.length;a1++) for(var a2=0;a2<ap.length;a2++){
      var cx=ap[a2], cy=ap[a1];
      if((cx===6&&cy===6)||(cx===6&&cy===size-7)||(cx===size-7&&cy===6)) continue;
      for(var dy2=-2;dy2<=2;dy2++) for(var dx2=-2;dx2<=2;dx2++)
        set(cx+dx2,cy+dy2, Math.max(Math.abs(dx2),Math.abs(dy2))!==1, true);
    }
    /* reserve format + version areas */
    for(var f=0;f<9;f++){ if(!fn[8][f]) set(f,8,false,true); if(!fn[f][8]) set(8,f,false,true); }
    for(var g=0;g<8;g++){ set(size-1-g,8,false,true); set(8,size-1-g,false,true); }
    set(8,size-8,true,true);
    if(version>=7){
      for(var vb=0;vb<18;vb++){
        var vx=Math.floor(vb/3), vy=size-11+(vb%3);
        set(vx,vy,false,true); set(vy,vx,false,true);
      }
    }

    /* --- place data (zigzag) --- */
    var bi=0, totalBits=final.length*8;
    function dataBit(idx){ return idx<totalBits ? (final[idx>>3]>>>(7-(idx&7)))&1 : 0; }
    for(var right=size-1; right>=1; right-=2){
      if(right===6) right=5;
      for(var vert=0; vert<size; vert++){
        for(var jj=0; jj<2; jj++){
          var xx = right-jj;
          var upward = ((right+1)&2)===0;
          var yy = upward ? size-1-vert : vert;
          if(!fn[yy][xx]){ mod[yy][xx]=dataBit(bi++); }
        }
      }
    }

    /* --- mask --- */
    function maskFn(m,x,y){
      switch(m){
        case 0: return (x+y)%2===0;
        case 1: return y%2===0;
        case 2: return x%3===0;
        case 3: return (x+y)%3===0;
        case 4: return (Math.floor(y/2)+Math.floor(x/3))%2===0;
        case 5: return (x*y)%2+(x*y)%3===0;
        case 6: return ((x*y)%2+(x*y)%3)%2===0;
        default: return (((x+y)%2)+((x*y)%3))%2===0;
      }
    }
    function applyMask(m){ for(var y=0;y<size;y++) for(var x=0;x<size;x++) if(!fn[y][x] && maskFn(m,x,y)) mod[y][x]^=1; }
    function penalty(){
      var p=0, y, x, run, i, dark=0;
      for(y=0;y<size;y++){ run=1; for(x=1;x<size;x++){ if(mod[y][x]===mod[y][x-1]) run++; else { if(run>=5) p+=3+(run-5); run=1; } } if(run>=5) p+=3+(run-5); }
      for(x=0;x<size;x++){ run=1; for(y=1;y<size;y++){ if(mod[y][x]===mod[y-1][x]) run++; else { if(run>=5) p+=3+(run-5); run=1; } } if(run>=5) p+=3+(run-5); }
      for(y=0;y<size-1;y++) for(x=0;x<size-1;x++){ var v=mod[y][x]; if(v===mod[y][x+1]&&v===mod[y+1][x]&&v===mod[y+1][x+1]) p+=3; }
      for(y=0;y<size;y++) for(x=0;x<size;x++) if(mod[y][x]) dark++;
      var ratio=dark/(size*size)*100;
      p += Math.floor(Math.abs(ratio-50)/5)*10;
      return p;
    }
    function drawFormat(m){
      var data=(LV.bits<<3)|m, rem=data<<10;
      for(var i=0;i<5;i++){ if(rem & (1<<(14-i))) rem ^= 0x537<<(4-i); }
      var f=((data<<10)|(rem&0x3FF))^0x5412;
      var sf=function(x,y,bit){ mod[y][x]=bit; };
      for(var k=0;k<=5;k++) sf(8,k,(f>>>k)&1);
      sf(8,7,(f>>>6)&1); sf(8,8,(f>>>7)&1); sf(7,8,(f>>>8)&1);
      for(var k2=9;k2<15;k2++) sf(14-k2,8,(f>>>k2)&1);
      for(var k3=0;k3<8;k3++) sf(size-1-k3,8,(f>>>k3)&1);
      for(var k4=8;k4<15;k4++) sf(8,size-15+k4,(f>>>k4)&1);
      sf(8,size-8,1);
    }
    function drawVersion(){
      if(version<7) return;
      var v=VERBITS[version];
      for(var i=0;i<18;i++){
        var bit=(v>>>i)&1, x=Math.floor(i/3), y=size-11+(i%3);
        mod[y][x]=bit; mod[x][y]=bit;
      }
    }

    var best=-1, bestScore=Infinity;
    for(var m=0;m<8;m++){
      applyMask(m); drawFormat(m); drawVersion();
      var sc=penalty();
      if(sc<bestScore){ bestScore=sc; best=m; }
      applyMask(m);
    }
    applyMask(best); drawFormat(best); drawVersion();

    var out=[]; for(var y2=0;y2<size;y2++){ var row=[]; for(var x2=0;x2<size;x2++) row.push(mod[y2][x2]===1); out.push(row); }
    return {size:size, modules:out, version:version};
  }

  function path(text, level){
    var q = make(text, level), d = '';
    for(var y=0;y<q.size;y++){
      var x=0;
      while(x<q.size){
        if(!q.modules[y][x]){ x++; continue; }
        var run=0; while(x+run<q.size && q.modules[y][x+run]) run++;
        d += 'M'+x+' '+y+'h'+run+'v1h-'+run+'z';
        x += run;
      }
    }
    return {size:q.size, d:d, version:q.version};
  }

  window.NUVQR = {make:make, path:path};
})();
