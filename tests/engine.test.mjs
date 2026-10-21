import test from 'node:test';
import assert from 'node:assert/strict';
import {Pine,DEFAULTS,PRESETS,evaluate} from '../src/engine.mjs';
import {parseKline,sortedUnique,findGaps,isContiguous,intervalMs,MARKETS} from '../src/feed.mjs';
function near(x,y){assert.ok(Math.abs(x-y)<1e-8,`Expected ${y}, got ${x}`);}
function candles(count=100){const list=Array.from({length:count},(_,i)=>{const p=100+Math.sin(i*.6)*.65;return{time:1800000000000+i*60000,open:p-.13,high:p+.52,low:p-.54,close:p+.13,volume:500};});
 const change=(i,o,h,l,c)=>Object.assign(list[i],{open:o,high:h,low:l,close:c});
 change(69,100.3,100.5,99.7,99.8);change(70,99.0,100.2,98.0,99.6);change(71,100.7,103.0,100.6,102.3);change(72,101.1,103.3,100.55,103.1);return list;}
test('Pine SMA/EMA/RMA match Kotlin baseline seeding',()=>{const x=[1,2,3,4,5];const s=Pine.sma(x,3),e=Pine.ema(x,3),r=Pine.rma(x,3);assert.ok(Number.isNaN(s[1]));near(s[2],2);near(s[3],3);near(e[0],1);near(e[1],1.5);near(e[2],2.25);assert.ok(Number.isNaN(r[1]));near(r[2],2);near(r[3],2+2/3);});
test('all five original presets retained',()=>{assert.equal(PRESETS.length,5);assert.deepEqual(PRESETS.map(x=>x.emaLength),[9,21,8,50,34]);assert.deepEqual(PRESETS.map(x=>x.atrMult),[3,1.5,2,2.5,1.2]);});
test('sweep / BOS / retrace / confirmed signal / delay / payout',()=>{const out=evaluate(candles(),{...DEFAULTS,useHistoricalDates:false},.01);assert.equal(out.snapshots[70].state,'LONG BOS BEKLE');assert.equal(out.snapshots[71].state,'LONG RETRACE');assert.equal(out.snapshots[72].coreLong,true);assert.equal(out.snapshots[72].side,null);assert.equal(out.snapshots[73].side,'LONG');assert.equal(out.marks[0].type,'ENTRY');assert.equal(out.marks[1].type,'CLOSE');assert.equal(out.latest.wins,1);assert.equal(out.latest.losses,0);near(out.latest.capital,10085);});
test('prefix invariant: later bars cannot revise historical signal or trade results',()=>{const bars=candles(100),engine=evaluate(bars,{...DEFAULTS},.01);for(let n=45;n<=100;n+=7){const partial=evaluate(bars.slice(0,n),{},.01);assert.deepEqual(partial.snapshots,engine.snapshots.slice(0,n));assert.deepEqual(partial.marks,engine.marks.filter(v=>v.time<=bars[n-1].time));}});
test('original 2025 date gate blocks signals in 2027 and is reversible',()=>{const bars=candles();const hist=evaluate(bars,{...DEFAULTS,useHistoricalDates:true},.01),live=evaluate(bars,{...DEFAULTS,useHistoricalDates:false},.01);assert.equal(hist.marks.length,0);assert.ok(live.marks.length>=2);});
test('changing signal delay from 1 to 2 shifts *entry* exact number of bars',()=>{const bars=candles();const a=evaluate(bars,{delayBars:1},.01),b=evaluate(bars,{delayBars:2},.01);assert.equal(a.marks[0].time,bars[73].time);assert.equal(b.marks[0].time,bars[74].time);});
test('no tick metadata, duplicate timestamps or malformed OHLCV are rejected',()=>{assert.throws(()=>evaluate(candles(),{},0),/fiyat adımı/);assert.throws(()=>evaluate([candles()[0],candles()[0]],{},.01),/benzersiz/);assert.throws(()=>evaluate([{time:1,open:1,close:2,low:3,high:4,volume:2}],{},.01),/Bozuk/);});
test('Binance bar parsing retains exact timestamps and source values',()=>{const c=parseKline([1700000000000,'100.10','100.20','99.90','100.05','23.45']);assert.deepEqual(c,{time:1700000000000,open:100.1,high:100.2,low:99.9,close:100.05,volume:23.45});});
test('rest candle merge and gap detection require contiguous closed data',()=>{const a={time:0},b={time:60000},c={time:180000};assert.deepEqual(sortedUnique([b,a,b]).map(x=>x.time),[0,60000]);assert.ok(isContiguous(a,b,'1m'));assert.equal(findGaps([a,b,c],'1m').length,1);near(intervalMs('5m'),300000);assert.equal(MARKETS.futures.name,'Binance USDⓈ-M Futures');});

test('Pine ta.sar reference progression, initial index and reversal clamp',()=>{
 const bars=[
  {open:9,high:10,low:8,close:9},
  {open:10,high:12,low:9,close:11},
  {open:11,high:13,low:10,close:12},
  {open:12,high:14,low:11,close:13},
  {open:11,high:13,low:7,close:8},
 ];
 const sar=Pine.sar(bars,.02,.02,.2);
 assert.ok(Number.isNaN(sar[0]));
 near(sar[1],8);near(sar[2],8);near(sar[3],8.2);near(sar[4],14);
});

test('automatic depletion limit uses current capital as Pine source does',()=>{
 const bars=candles(100),out=evaluate(bars,{tradePercentInput:10,maxLossMode:'Otomatik'},.01);
 const amount=out.latest.capital*.1;let capital=out.latest.capital,stake=amount,count=0;
 while(capital>=stake&&stake>0&&count<10000){capital-=stake;count++;stake=Math.max(stake*2.5,amount);}
 assert.equal(out.latest.maxLossCount,count);
});