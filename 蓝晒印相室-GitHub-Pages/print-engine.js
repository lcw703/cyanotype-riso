// Deterministic two-ink print simulation; no network or generative model.
function hash(x,y){let n=Math.imul(x+37,374761393)^Math.imul(y+71,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295}
function paperNoise(x,y,scale){const gx=x/scale,gy=y/scale,ix=Math.floor(gx),iy=Math.floor(gy);let fx=gx-ix,fy=gy-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);return (hash(ix,iy)*(1-fx)+hash(ix+1,iy)*fx)*(1-fy)+(hash(ix,iy+1)*(1-fx)+hash(ix+1,iy+1)*fx)*fy;}
const printCache=new WeakMap();
function printLuminance(source){if(printCache.has(source))return printCache.get(source);const {width:w,height:h,data}=source,n=w*h,luma=new Float32Array(n),hist=new Uint32Array(256);let count=0;
 for(let p=0;p<n;p++){const i=p*4,v=(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2])/255;luma[p]=v;if(data[i+3]){hist[Math.round(v*255)]++;count++;}}
 let low=0,high=255,sum=0;for(let i=0;i<256;i++){sum+=hist[i];if(sum<count*.025)low=i;if(sum<count*.975)high=i;}
 const local=new Float32Array(n),temp=new Float32Array(n),r=Math.max(1,Math.round(Math.max(w,h)/500)),span=2*r+1;
 // Separable box average for restrained edge detail, with replicated borders.
 for(let y=0;y<h;y++){let s=0;for(let k=-r;k<=r;k++)s+=luma[y*w+Math.max(0,Math.min(w-1,k))];for(let x=0;x<w;x++){temp[y*w+x]=s/span;s+=luma[y*w+Math.min(w-1,x+r+1)]-luma[y*w+Math.max(0,x-r)];}}
 for(let x=0;x<w;x++){let s=0;for(let k=-r;k<=r;k++)s+=temp[Math.max(0,Math.min(h-1,k))*w+x];for(let y=0;y<h;y++){local[y*w+x]=s/span;s+=temp[Math.min(h-1,y+r+1)*w+x]-temp[Math.max(0,y-r)*w+x];}}
 const flat=(high-low)/255<.1;const result={luma,local,low:flat?0:low/255,range:flat?1:Math.max(.1,(high-low)/255)};printCache.set(source,result);return result;}
function colorize(source,alpha,strength,grain,reference=null){const {width:w,height:h,data}=source,out=new ImageData(w,h),o=out.data,{luma,local}=printLuminance(source),{low,range}=reference||printLuminance(source),scale=Math.max(w,h)/1200,shift=Math.max(1,Math.round(scale)),blue=[15,66,104],paper=[249,231,195],orange=[255,108,27];
 for(let p=0;p<w*h;p++){const i=p*4,x=p%w,y=Math.floor(p/w);const norm=Math.max(0,Math.min(1,(luma[p]-low)/range));const detail=(luma[p]-local[p])*.8;
 let tone=Math.max(0,Math.min(1,Math.pow(norm,.64)+detail));tone=Math.max(0,Math.min(1,(tone-.5)*(1.1+strength*.4)+.55));
 // Five ink densities with a gentle transition; highlights reveal the paper.
 const stepped=Math.round(tone*5)/5;tone=tone*.55+stepped*.45;if(tone>.87)tone=.95+(tone-.87)*.38;
 let ink=1-tone;const fine=paperNoise(x/scale,y/scale,1),clump=paperNoise(x/scale,y/scale,2.2);const texture=(fine-.5)*.6+(clump-.5)*.4;
 const mid=4*ink*(1-ink);ink=Math.max(0,Math.min(1,ink+texture*grain*.58*(.3+.7*mid)));
 // Sparse ink voids follow tonal density rather than covering the whole photo in white noise.
 if(clump>.64&&fine>1-grain*.12&&ink>.13)ink*=.38;
 const weave=(paperNoise(x/scale,y/scale,7)-.5)*grain*7+(paperNoise(x/scale,y/scale/2,1)-.5)*grain*3;
 const shifted=(y*w+Math.max(0,x-shift))*4,accent=alpha[shifted+3]/255;
 const orangeInk=Math.max(0,Math.min(1,.6+ink*.4+texture*grain*.24));
 for(let c=0;c<3;c++){const b=paper[c]*(1-ink)+blue[c]*ink;const a=paper[c]*(1-orangeInk)+orange[c]*orangeInk;o[i+c]=(b*(1-accent)+a*accent)+weave;}o[i+3]=data[i+3];
 }return out;}
