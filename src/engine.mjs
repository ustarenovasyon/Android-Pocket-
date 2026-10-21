/* P🌀CKET LSR - deterministic closed-candle port of the supplied Pine Script v5.
 * No network access, fabricated prices, brokerage orders, or forward-looking candles.
 * Every evaluation replays chronological, confirmed OHLCV candles only.
 */
const N = NaN;
export const DEFAULTS = Object.freeze({
  tradeMode:'Yüzde',tradePercentInput:1,tradeAmountInput:1,startCapital:10000,presetSelect:1,useManualFilters:false,
  emaOn_manual:true,rsiOn_manual:true,atrOn_manual:true,stochOn_manual:false,macdOn_manual:true,
  volFilterOn_manual:true,volFilterPeriod_manual:14,volFilterThresh_manual:1,
  cciOn_manual:true,cciPeriod_manual:20,cciLow_manual:-100,cciHigh_manual:100,
  keltnerOn_manual:false,keltnerLength_manual:20,keltnerMult_manual:1.5,
  ichimokuOn_manual:false,ichimokuConv_manual:9,ichimokuBase_manual:26,ichimokuSpanB_manual:52,
  psarOn_manual:false,psarStep_manual:0.02,psarMax_manual:0.2,
  volOscOn_manual:false,volOscShort_manual:5,volOscLong_manual:20,
  mfiOn_manual:false,mfiPeriod_manual:14,heikinAshiOn_manual:false,obvOn_manual:false,
  trShockOn_manual:true,trAvgLength_manual:8,trShockMult_manual:1.40,
  tarihBas:1748131200000,tarihBit:1758844740000,
  useDelayBars:true,delayBars:1,multiplierLost:2.5,evalBars:5,manualPayout:85,
  tradeLength:5,maxLossMode:'Otomatik',manualMaxLossCount:15,
  strictness:5,legacyFiltersOn:false,coreEMAContextOn:true,coreEMALength:50,
  swingLeft:3,swingRight:3,bosMaxBarsInput:12,retraceMaxBarsInput:15,
  obLookback:4,atrCoreLen:14,minAtrPctInput:0.03,maxAtrPctInput:8,
  maxSpikeMultInput:3,fvgMinAtrInput:0.05,zoneInvalidateAtr:0.15,
  showCoreZones:true,showCoreEMA:false,showDebugMarks:false,
  useHistoricalDates:false,
});
export const PRESETS = Object.freeze([
  {ema:true,emaLength:9,rsi:true,rsiLength:14,rsiLow:30,rsiHigh:70,atr:true,atrLength:14,atrMult:3,stoch:false,stochK:14,stochD:3,macd:true,macdFast:12,macdSlow:26,macdSignal:9},
  {ema:true,emaLength:21,rsi:true,rsiLength:7,rsiLow:40,rsiHigh:60,atr:false,atrLength:7,atrMult:1.5,stoch:true,stochK:14,stochD:3,macd:false,macdFast:5,macdSlow:35,macdSignal:5},
  {ema:true,emaLength:8,rsi:true,rsiLength:9,rsiLow:35,rsiHigh:65,atr:true,atrLength:14,atrMult:2,stoch:true,stochK:5,stochD:3,macd:true,macdFast:8,macdSlow:21,macdSignal:5},
  {ema:true,emaLength:50,rsi:true,rsiLength:14,rsiLow:45,rsiHigh:55,atr:true,atrLength:21,atrMult:2.5,stoch:false,stochK:14,stochD:3,macd:true,macdFast:12,macdSlow:26,macdSignal:9},
  {ema:true,emaLength:34,rsi:true,rsiLength:21,rsiLow:20,rsiHigh:80,atr:false,atrLength:14,atrMult:1.2,stoch:true,stochK:14,stochD:3,macd:false,macdFast:9,macdSlow:26,macdSignal:9},
]);
export const Pine = {
  sma(x,len){let sum=0,q=[],a=Array(x.length).fill(N);for(let i=0;i<x.length;i++){if(!Number.isNaN(x[i])){q.push(x[i]);sum+=x[i];if(q.length>len)sum-=q.shift();if(q.length===len)a[i]=sum/len;}}return a;},
  ema(x,len){let prev=N,alpha=2/(len+1);return x.map(v=>{if(!Number.isNaN(v))prev=Number.isNaN(prev)?v:alpha*v+(1-alpha)*prev;return prev;});},
  rma(x,len){let sum=0,count=0,prev=N;return x.map(v=>{if(!Number.isNaN(v)){if(Number.isNaN(prev)){sum+=v;count++;if(count===len)prev=sum/len;}else prev=(prev*(len-1)+v)/len;}return prev;});},
  tr(b){return b.map((v,i)=>i===0?v.high-v.low:Math.max(v.high-v.low,Math.abs(v.high-b[i-1].close),Math.abs(v.low-b[i-1].close)));},
  stdev(x,len){return x.map((_,i)=>{if(i<len-1)return N;let a=x.slice(i-len+1,i+1);if(a.some(Number.isNaN))return N;let mean=a.reduce((p,v)=>p+v,0)/len;return Math.sqrt(a.reduce((p,v)=>p+(v-mean)**2,0)/len);});},
  highest(x,len){return x.map((_,i)=>i<len-1?N:Math.max(...x.slice(i-len+1,i+1)));},
  lowest(x,len){return x.map((_,i)=>i<len-1?N:Math.min(...x.slice(i-len+1,i+1)));},
  rsi(x,len){const up=x.map((v,i)=>i?Math.max(v-x[i-1],0):N),down=x.map((v,i)=>i?Math.max(x[i-1]-v,0):N),u=Pine.rma(up,len),d=Pine.rma(down,len);return x.map((_,i)=>Number.isNaN(u[i])||Number.isNaN(d[i])?N:!d[i]&&!u[i]?N:!d[i]?100:!u[i]?0:100-100/(1+u[i]/d[i]));},
  stoch(c,h,l,len){const hi=Pine.highest(h,len),lo=Pine.lowest(l,len);return c.map((v,i)=>Number.isNaN(hi[i])||hi[i]===lo[i]?N:100*(v-lo[i])/(hi[i]-lo[i]));},
  cci(x,len){const ma=Pine.sma(x,len);return x.map((v,i)=>{if(i<len-1||Number.isNaN(ma[i]))return N;let dev=x.slice(i-len+1,i+1).reduce((s,q)=>s+Math.abs(q-ma[i]),0)/len;return dev===0?N:(v-ma[i])/(0.015*dev);});},
  mfi(b,len){const t=b.map(v=>(v.high+v.low+v.close)/3),raw=t.map((v,i)=>v*b[i].volume),out=Array(b.length).fill(N);for(let i=len-1;i<b.length;i++){let plus=0,minus=0;for(let j=i-len+1;j<=i;j++){if(j>0&&t[j]>t[j-1])plus+=raw[j];if(j>0&&t[j]<t[j-1])minus+=raw[j];}out[i]=plus===0&&minus===0?N:minus===0?100:100-100/(1+plus/minus);}return out;},
  // TradingView ta.sar() reference algorithm: compute the first trend bar on index 1,
  // apply acceleration even on that bar, and use the previous two price limits.
  // Source-compatible start is 0.02; increment is the user's psarStep_manual.
  sar(b,start,inc,maxAcc){
   const out=Array(b.length).fill(N);
   if(b.length<2)return out;
   let result=N,extreme=N,acc=N,isBelow=false;
   for(let i=1;i<b.length;i++){
    let firstTrendBar=false;
    if(i===1){
     isBelow=b[i].close>b[i-1].close;
     extreme=isBelow?b[i].high:b[i].low;
     result=isBelow?b[i-1].low:b[i-1].high;
     acc=start;
     firstTrendBar=true;
    }
    result=result+acc*(extreme-result);
    if(isBelow){
     if(result>b[i].low){
      firstTrendBar=true;isBelow=false;result=Math.max(b[i].high,extreme);
      extreme=b[i].low;acc=start;
     }
    }else if(result<b[i].high){
     firstTrendBar=true;isBelow=true;result=Math.min(b[i].low,extreme);
     extreme=b[i].high;acc=start;
    }
    if(!firstTrendBar){
     if(isBelow&&b[i].high>extreme){extreme=b[i].high;acc=Math.min(acc+inc,maxAcc);}
     else if(!isBelow&&b[i].low<extreme){extreme=b[i].low;acc=Math.min(acc+inc,maxAcc);}
    }
    if(isBelow){
     result=Math.min(result,b[i-1].low);
     if(i>1)result=Math.min(result,b[i-2].low);
    }else{
     result=Math.max(result,b[i-1].high);
     if(i>1)result=Math.max(result,b[i-2].high);
    }
    out[i]=result;
   }
   return out;
  },
  pivotHigh(x,left,right){return x.map((_,i)=>{let p=i-right;if(p<left)return N;const pivot=x[p];for(let k=p-left;k<p;k++)if(x[k]>pivot)return N;for(let k=p+1;k<=i;k++)if(x[k]>=pivot)return N;return pivot;});},
  pivotLow(x,left,right){return x.map((_,i)=>{let p=i-right;if(p<left)return N;const pivot=x[p];for(let k=p-left;k<p;k++)if(x[k]<pivot)return N;for(let k=p+1;k<=i;k++)if(x[k]<=pivot)return N;return pivot;});},
};
const clip=(n,a,b)=>Math.max(a,Math.min(b,n));
const score=(pen,wick,disp,rank,pts,context,market)=>clip(pen/.30,0,1)*10+clip(wick/.45,0,1)*10+clip(disp/1.4,0,1)*20+(rank>=3?20:rank===2?17:rank===1?12:0)+clip(pts/4,0,1)*25+(context?10:0)+(market?5:0);
const emptyDirection=()=>({state:0,sweepBar:-1,breakBar:-1,breakLevel:N,sweepPenAtr:N,sweepWick:N,dispBodyAtr:N,zone:null});
function selectZone(ob,fvg,strictness){let both=!!ob&&!!fvg;if(strictness>=8&&!both)return null;if(both){const low=Math.max(ob.low,fvg.low),high=Math.min(ob.high,fvg.high);if(low<=high)return {low,high,rank:3,type:'OB+FVG OVERLAP'};if(strictness>=10)return null;return {...fvg,rank:2,type:'OB+FVG'};}return fvg||ob;}
function autoMaxLoss(cap,first,mult){let amt=first,count=0;while(cap>=amt&&amt>0&&count<10000){cap-=amt;count++;amt=Math.max(amt*mult,first);}return count;}
export function evaluate(bars,config={},minTick){
 const cfg={...DEFAULTS,...config};
 if(!Number.isFinite(minTick)||minTick<=0)throw new Error('Gerçek parite fiyat adımı (tick size) doğrulanmadı.');
 for(let i=0;i<bars.length;i++){const v=bars[i];if(!(Number.isFinite(v.time)&&Number.isFinite(v.open)&&Number.isFinite(v.high)&&Number.isFinite(v.low)&&Number.isFinite(v.close)&&Number.isFinite(v.volume)&&v.high>=Math.max(v.open,v.close)&&v.low<=Math.min(v.open,v.close)&&v.volume>=0))throw new Error(`Bozuk OHLCV: ${i}`);if(i&&v.time<=bars[i-1].time)throw new Error('Mumlar sıralı/benzersiz olmalı');}
 if(!bars.length)return {bars:[],snapshots:[],marks:[],latest:null};
 const n=bars.length,o=bars.map(x=>x.open),h=bars.map(x=>x.high),l=bars.map(x=>x.low),c=bars.map(x=>x.close),vol=bars.map(x=>x.volume),tp=bars.map(v=>(v.high+v.low+v.close)/3);
 const tr=Pine.tr(bars),atrCore=Pine.rma(tr,cfg.atrCoreLen),trCoreAvg=Pine.sma(tr,cfg.atrCoreLen),emaContext=Pine.ema(c,cfg.coreEMALength),microFast=Pine.ema(c,3),microSlow=Pine.ema(c,5),pHigh=Pine.pivotHigh(h,cfg.swingLeft,cfg.swingRight),pLow=Pine.pivotLow(l,cfg.swingLeft,cfg.swingRight);
 const p=PRESETS[cfg.presetSelect-1]||PRESETS[0],enabled=(name,base)=>cfg[name+'_manual']&&(cfg.useManualFilters||p[base]);
 const emaOn=enabled('emaOn','ema'),rsiOn=enabled('rsiOn','rsi'),atrOn=enabled('atrOn','atr'),stochOn=enabled('stochOn','stoch'),macdOn=enabled('macdOn','macd');
 const ema=Pine.ema(c,p.emaLength),rsi=Pine.rsi(c,p.rsiLength),atr=Pine.rma(tr,p.atrLength),atrAvg=Pine.sma(atr,p.atrLength),stoch=Pine.stoch(c,h,l,p.stochK);
 const fast=Pine.ema(c,p.macdFast),slow=Pine.ema(c,p.macdSlow),macdLine=fast.map((v,i)=>v-slow[i]),macdSignal=Pine.ema(macdLine,p.macdSignal);
 const stdev=Pine.stdev(c,cfg.volFilterPeriod_manual),cci=Pine.cci(tp,cfg.cciPeriod_manual),kelEma=Pine.ema(c,cfg.keltnerLength_manual),kelAtr=Pine.rma(tr,cfg.keltnerLength_manual);
 const tenkanH=Pine.highest(h,cfg.ichimokuConv_manual),tenkanL=Pine.lowest(l,cfg.ichimokuConv_manual),kijunH=Pine.highest(h,cfg.ichimokuBase_manual),kijunL=Pine.lowest(l,cfg.ichimokuBase_manual),spanH=Pine.highest(h,cfg.ichimokuSpanB_manual),spanL=Pine.lowest(l,cfg.ichimokuSpanB_manual);
 const psar=Pine.sar(bars,.02,cfg.psarStep_manual,cfg.psarMax_manual),volS=Pine.sma(vol,cfg.volOscShort_manual),volL=Pine.sma(vol,cfg.volOscLong_manual),mfi=Pine.mfi(bars,cfg.mfiPeriod_manual),trAvg=Pine.sma(tr,cfg.trAvgLength_manual);
 const st=(cfg.strictness-1)/9,minSweepPen=.01+st*.12,minSweepWick=.10+st*.22,minDispBody=.35+st*.65,minDispRange=.60+st*.75,reactionWickMin=.08+st*.22,minFvg=cfg.fvgMinAtrInput*(.75+st*.75),minAtrPct=cfg.minAtrPctInput*(1+st*.5),maxAtrPct=cfg.maxAtrPctInput*(1-st*.35),maxSpike=cfg.maxSpikeMultInput*(1-st*.2),bosMax=Math.max(3,Math.floor(cfg.bosMaxBarsInput-st*4+.5)),retraceMax=Math.max(3,Math.floor(cfg.retraceMaxBarsInput-st*5+.5)),reactionPoints=cfg.strictness<=3?2:cfg.strictness<=7?3:4,scoreThreshold=48+st*34;
 const bull=emptyDirection(),bear=emptyDirection(),coreLong=Array(n).fill(false),coreShort=Array(n).fill(false);
 let lastHigh=N,lastLow=N,lastCoreScore=N,lastCoreSide='—',haPrev=N,prevHaClose=N,obv=0,previousObv=N,capital=cfg.startCapital,wins=0,losses=0,cumulativeLoss=0;
 const firstAmt=cfg.tradeMode==='Yüzde'?cfg.startCapital*cfg.tradePercentInput/100:cfg.tradeAmountInput;
 let lastAmt=firstAmt,lastWon=null,streakWin=0,streakLose=0,maxStreakWin=0,maxStreakLose=0,inTrade=false,tradeStart=-1,tradeLong=false,entry=N,exhausted=false;
 const snapshots=[],marks=[];
 for(let i=0;i<n;i++){
  const bar=bars[i],body=Math.abs(c[i]-o[i]),range=Math.max(h[i]-l[i],minTick),lowerWick=Math.max(0,Math.min(o[i],c[i])-l[i])/range,upperWick=Math.max(0,h[i]-Math.max(o[i],c[i]))/range;
  if(!Number.isNaN(pHigh[i]))lastHigh=pHigh[i];if(!Number.isNaN(pLow[i]))lastLow=pLow[i];
  const a=atrCore[i],atrPct=c[i]!==0?a/c[i]*100:N,marketOk=!Number.isNaN(a)&&!Number.isNaN(trCoreAvg[i])&&atrPct>=minAtrPct&&atrPct<=maxAtrPct&&tr[i]<=trCoreAvg[i]*maxSpike;
  const ctxLong=!cfg.coreEMAContextOn||(c[i]>emaContext[i]&&(cfg.strictness<6||(i>0&&emaContext[i]>=emaContext[i-1]))),ctxShort=!cfg.coreEMAContextOn||(c[i]<emaContext[i]&&(cfg.strictness<6||(i>0&&emaContext[i]<=emaContext[i-1])));
  const bullPen=!Number.isNaN(lastLow)&&a>0?(lastLow-l[i])/a:N,bearPen=!Number.isNaN(lastHigh)&&a>0?(h[i]-lastHigh)/a:N;
  const bullSweep=marketOk&&!Number.isNaN(lastLow)&&!Number.isNaN(lastHigh)&&l[i]<lastLow&&c[i]>lastLow&&bullPen>=minSweepPen&&lowerWick>=minSweepWick,bearSweep=marketOk&&!Number.isNaN(lastLow)&&!Number.isNaN(lastHigh)&&h[i]>lastHigh&&c[i]<lastHigh&&bearPen>=minSweepPen&&upperWick>=minSweepWick;
  if(bullSweep)Object.assign(bull,emptyDirection(),{state:1,sweepBar:i,breakLevel:lastHigh,sweepPenAtr:bullPen,sweepWick:lowerWick});
  if(bearSweep)Object.assign(bear,emptyDirection(),{state:1,sweepBar:i,breakLevel:lastLow,sweepPenAtr:bearPen,sweepWick:upperWick});
  if(bull.state===1&&i-bull.sweepBar>bosMax)bull.state=0;
  if(bear.state===1&&i-bear.sweepBar>bosMax)bear.state=0;
  const dispBody=a>0?body/a:0,dispRange=a>0?range/a:0;
  const bullBreak=bull.state===1&&i>bull.sweepBar&&!Number.isNaN(bull.breakLevel)&&c[i]>bull.breakLevel&&c[i]>o[i]&&dispBody>=minDispBody&&dispRange>=minDispRange;
  const bearBreak=bear.state===1&&i>bear.sweepBar&&!Number.isNaN(bear.breakLevel)&&c[i]<bear.breakLevel&&c[i]<o[i]&&dispBody>=minDispBody&&dispRange>=minDispRange;
  if(bullBreak){let j;for(let k=1;k<=cfg.obLookback;k++)if(i>=k&&c[i-k]<o[i-k]){j=k;break;}const ob=j===undefined?null:{low:l[i-j],high:o[i-j],rank:1,type:'OB'},fvg=i>=2&&l[i]>h[i-2]&&l[i]-h[i-2]>=a*minFvg?{low:h[i-2],high:l[i],rank:1,type:'FVG'}:null,zone=selectZone(ob,fvg,cfg.strictness);if(zone&&zone.high>=zone.low)Object.assign(bull,{state:2,breakBar:i,dispBodyAtr:dispBody,zone});else bull.state=0;}
  if(bearBreak){let j;for(let k=1;k<=cfg.obLookback;k++)if(i>=k&&c[i-k]>o[i-k]){j=k;break;}const ob=j===undefined?null:{low:o[i-j],high:h[i-j],rank:1,type:'OB'},fvg=i>=2&&h[i]<l[i-2]&&l[i-2]-h[i]>=a*minFvg?{low:h[i],high:l[i-2],rank:1,type:'FVG'}:null,zone=selectZone(ob,fvg,cfg.strictness);if(zone&&zone.high>=zone.low)Object.assign(bear,{state:2,breakBar:i,dispBodyAtr:dispBody,zone});else bear.state=0;}
  if(bull.state===2&&(i-bull.breakBar>retraceMax||c[i]<(bull.zone.low-a*cfg.zoneInvalidateAtr)))bull.state=0;
  if(bear.state===2&&(i-bear.breakBar>retraceMax||c[i]>(bear.zone.high+a*cfg.zoneInvalidateAtr)))bear.state=0;
  const microLongBase=i>0&&c[i]>o[i]&&c[i]>c[i-1],microShortBase=i>0&&c[i]<o[i]&&c[i]<c[i-1],microLongStrong=microLongBase&&i>1&&c[i]>c[i-2]&&microFast[i]>microSlow[i],microShortStrong=microShortBase&&i>1&&c[i]<c[i-2]&&microFast[i]<microSlow[i],microLong=cfg.strictness>=7?microLongStrong:microLongBase,microShort=cfg.strictness>=7?microShortStrong:microShortBase;
  const bullTouch=bull.state===2&&i>bull.breakBar&&l[i]<=bull.zone.high&&h[i]>=bull.zone.low,bearTouch=bear.state===2&&i>bear.breakBar&&h[i]>=bear.zone.low&&l[i]<=bear.zone.high;
  const bullMid=bull.zone?(bull.zone.low+bull.zone.high)/2:N,bearMid=bear.zone?(bear.zone.low+bear.zone.high)/2:N;
  const bullPts=bullTouch?(c[i]>o[i]?1:0)+(c[i]>=bullMid?1:0)+(lowerWick>=reactionWickMin?1:0)+(microLong?1:0):0,bearPts=bearTouch?(c[i]<o[i]?1:0)+(c[i]<=bearMid?1:0)+(upperWick>=reactionWickMin?1:0)+(microShort?1:0):0;
  if(bullTouch&&bullPts>=reactionPoints&&ctxLong&&marketOk){const s=score(bull.sweepPenAtr,bull.sweepWick,bull.dispBodyAtr,bull.zone.rank,bullPts,ctxLong,marketOk);if(s>=scoreThreshold){coreLong[i]=true;lastCoreScore=s;lastCoreSide='LONG';bull.state=0;bear.state=0;}}
  if(bearTouch&&bearPts>=reactionPoints&&ctxShort&&marketOk){const s=score(bear.sweepPenAtr,bear.sweepWick,bear.dispBodyAtr,bear.zone.rank,bearPts,ctxShort,marketOk);if(s>=scoreThreshold){coreShort[i]=true;lastCoreScore=s;lastCoreSide='SHORT';bull.state=0;bear.state=0;}}
  const state=coreLong[i]?'LONG ENTRY':coreShort[i]?'SHORT ENTRY':bull.state===2?'LONG RETRACE':bear.state===2?'SHORT RETRACE':bull.state===1?'LONG BOS BEKLE':bear.state===1?'SHORT BOS BEKLE':'SWEEP BEKLE',activeZone=bull.state===2?bull.zone:bear.state===2?bear.zone:null;
  const haClose=(o[i]+h[i]+l[i]+c[i])/4;
  if(i===0)haPrev=(o[i]+c[i])/2;
  const haOpen=(haPrev+(Number.isNaN(prevHaClose)?haClose:prevHaClose))/2;haPrev=haOpen;prevHaClose=haClose;
  if(i>0)obv+=c[i]>c[i-1]?vol[i]:c[i]<c[i-1]?-vol[i]:0;
  const obvSlope=Number.isNaN(previousObv)?N:obv-previousObv;previousObv=obv;
  let legacyLong=true,legacyShort=true;
  if(cfg.legacyFiltersOn){
   if(emaOn){legacyLong&&=c[i]>ema[i];legacyShort&&=c[i]<ema[i];}
   if(rsiOn){const ok=rsi[i]>p.rsiLow&&rsi[i]<p.rsiHigh;legacyLong&&=ok;legacyShort&&=ok;}
   if(atrOn){const ok=atr[i]>atrAvg[i]*p.atrMult;legacyLong&&=ok;legacyShort&&=ok;}
   if(stochOn){legacyLong&&=stoch[i]<20;legacyShort&&=stoch[i]>80;}
   if(macdOn){legacyLong&&=macdLine[i]>macdSignal[i];legacyShort&&=macdLine[i]<macdSignal[i];}
   const volOk=!cfg.volFilterOn_manual||stdev[i]>cfg.volFilterThresh_manual,cciOk=!cfg.cciOn_manual||(cci[i]>cfg.cciLow_manual&&cci[i]<cfg.cciHigh_manual),kelUpper=kelEma[i]+kelAtr[i]*cfg.keltnerMult_manual,kelLower=kelEma[i]-kelAtr[i]*cfg.keltnerMult_manual,spanA=(tenkanH[i]+tenkanL[i]+kijunH[i]+kijunL[i])/4,spanB=(spanH[i]+spanL[i])/2,volOsc=volS[i]-volL[i],shockOk=!cfg.trShockOn_manual||tr[i]>trAvg[i]*cfg.trShockMult_manual,common=volOk&&cciOk&&shockOk;
   legacyLong=legacyLong&&common&&(!cfg.keltnerOn_manual||c[i]>kelUpper)&&(!cfg.ichimokuOn_manual||(c[i]>spanA&&c[i]>spanB))&&(!cfg.psarOn_manual||c[i]>psar[i])&&(!cfg.volOscOn_manual||volOsc>0)&&(!cfg.mfiOn_manual||mfi[i]>50)&&(!cfg.heikinAshiOn_manual||haClose>haOpen)&&(!cfg.obvOn_manual||obvSlope>0);
   legacyShort=legacyShort&&common&&(!cfg.keltnerOn_manual||c[i]<kelLower)&&(!cfg.ichimokuOn_manual||(c[i]<spanA&&c[i]<spanB))&&(!cfg.psarOn_manual||c[i]<psar[i])&&(!cfg.volOscOn_manual||volOsc<0)&&(!cfg.mfiOn_manual||mfi[i]<50)&&(!cfg.heikinAshiOn_manual||haClose<haOpen)&&(!cfg.obvOn_manual||obvSlope<0);
  }
  const inDate=!cfg.useHistoricalDates||(bar.time>=cfg.tarihBas&&bar.time<=cfg.tarihBit),delayedIndex=cfg.useDelayBars?i-cfg.delayBars:i,delayedLong=delayedIndex>=0&&coreLong[delayedIndex],delayedShort=delayedIndex>=0&&coreShort[delayedIndex];
  const maxLossCount=cfg.maxLossMode==='Manuel'?cfg.manualMaxLossCount:autoMaxLoss(capital,cfg.tradeMode==='Yüzde'?capital*cfg.tradePercentInput/100:cfg.tradeAmountInput,cfg.multiplierLost);
  if(inDate&&maxStreakLose>=maxLossCount)exhausted=true;
  if(exhausted)inTrade=false;
  // Pine evaluates whether a new signal is allowed before settling the existing trade.
  const available=!inTrade,longSignal=available&&delayedLong&&legacyLong&&inDate&&!exhausted,shortSignal=available&&delayedShort&&legacyShort&&inDate&&!exhausted;
  if(inTrade&&i-tradeStart>=cfg.tradeLength){const won=tradeLong?c[i]>entry:c[i]<entry;marks.push({time:bar.time,side:tradeLong?'LONG':'SHORT',type:'CLOSE',entry,exit:c[i],won});if(won){capital+=lastAmt*cfg.manualPayout/100;wins++;cumulativeLoss=Math.max(0,cumulativeLoss-lastAmt*cfg.manualPayout/100);lastAmt=firstAmt;streakWin++;streakLose=0;maxStreakWin=Math.max(maxStreakWin,streakWin);}else{capital-=lastAmt;losses++;cumulativeLoss+=lastAmt;lastAmt=cfg.tradeMode==='Yüzde'?cumulativeLoss*cfg.multiplierLost:Math.max(cumulativeLoss*cfg.multiplierLost,cfg.tradeAmountInput);streakLose++;streakWin=0;maxStreakLose=Math.max(maxStreakLose,streakLose);}lastWon=won;inTrade=false;tradeStart=-1;entry=N;}
  if(!inTrade&&(longSignal||shortSignal)){inTrade=true;tradeStart=i;tradeLong=longSignal;entry=c[i];marks.push({time:bar.time,side:longSignal?'LONG':'SHORT',type:'ENTRY',entry:c[i]});}
  const nextAmount=inTrade?lastAmt:Math.max(firstAmt,cumulativeLoss*cfg.multiplierLost);
  snapshots.push({time:bar.time,side:longSignal?'LONG':shortSignal?'SHORT':null,coreLong:coreLong[i],coreShort:coreShort[i],coreScore:Number.isNaN(lastCoreScore)?null:lastCoreScore,coreSide:lastCoreSide,state,zoneType:activeZone?.type||'—',zoneLow:activeZone?.low??null,zoneHigh:activeZone?.high??null,ema:emaOn&&Number.isFinite(ema[i])?ema[i]:null,contextEma:Number.isFinite(emaContext[i])?emaContext[i]:null,capital,wins,losses,consecutiveWins:streakWin,consecutiveLosses:streakLose,maxWins:maxStreakWin,maxLosses:maxStreakLose,maxLossCount,cumulativeLoss,lastAmount:lastAmt,nextAmount,exhausted,inTrade,entryPrice:Number.isNaN(entry)?null:entry,lastWon,
   bullSweep,bearSweep,bullBreak,bearBreak});
 }
 return {bars,snapshots,marks,latest:snapshots.at(-1)};
}