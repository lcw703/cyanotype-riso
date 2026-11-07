// Select small, saturated warm-color regions. This is color analysis, not semantic object recognition.
function automaticAccent(source,amount){
 const {width:w,height:h,data}=source,n=w*h,result=new ImageData(w,h);if(amount<=0)return result;
 const score=new Float32Array(n),seen=new Uint8Array(n),queue=new Int32Array(n),regions=[];
 for(let p=0;p<n;p++){const i=p*4,r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255,max=Math.max(r,g,b),min=Math.min(r,g,b),chroma=max-min,saturation=max?chroma/max:0;
 // Require clear red/orange/yellow chroma; neutral walls and gray shadows stay blue.
 const cb=128+255*(-.168736*r-.331264*g+.5*b),cr=128+255*(.5*r-.418688*g-.081312*b);
 const skinLike=r>g&&g>b&&cb>77&&cb<127&&cr>133&&cr<173&&saturation<.65;
 if(!skinLike&&data[i+3]&&r>b+.07&&r>=g*.95&&saturation>.3&&max>.23){const warmth=Math.min(1,(r-b)*2.5);score[p]=saturation*warmth;}}
 const threshold=.2+(1-amount)*.18;
 for(let p=0;p<n;p++){if(seen[p]||score[p]<threshold)continue;let head=0,tail=1,total=0;queue[0]=p;seen[p]=1;const pixels=[];
 while(head<tail){const v=queue[head++];pixels.push(v);total+=score[v];const x=v%w;for(const u of [x>0?v-1:-1,x<w-1?v+1:-1,v>=w?v-w:-1,v<n-w?v+w:-1])if(u>=0&&!seen[u]&&score[u]>=threshold){seen[u]=1;queue[tail++]=u;}}
 if(pixels.length>=Math.max(5,n*.000015)&&pixels.length<=n*.16)regions.push({pixels,priority:total/Math.sqrt(pixels.length)});
 }
 regions.sort((a,b)=>b.priority-a.priority);const budget=Math.floor(n*(.025+.075*amount));let used=0;
 for(const region of regions){if(used+region.pixels.length>budget)continue;for(const p of region.pixels){const i=p*4;result.data[i]=result.data[i+1]=result.data[i+2]=255;result.data[i+3]=255;}used+=region.pixels.length;}
 return result;
}
