/* Official public market-data feeds; fail closed on missing metadata or malformed candles. */
export const MARKETS = Object.freeze({
 spot:{name:'Binance Spot',rest:'https://api.binance.com/api/v3',alternates:['https://data-api.binance.vision/api/v3','https://api1.binance.com/api/v3'],socket:'wss://stream.binance.com:443/ws/'},
 futures:{name:'Binance USDⓈ-M Futures',rest:'https://fapi.binance.com/fapi/v1',alternates:[],socket:'wss://fstream.binance.com/ws/'}
});
export const TIMEFRAMES=['1s','1m','3m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','1w'];
const abortError=()=>new DOMException('İstek iptal edildi','AbortError');
const nap=ms=>new Promise(ok=>setTimeout(ok,ms));
export function intervalMs(v){const n=parseInt(v,10),unit=v.slice(-1);return n*({s:1000,m:60000,h:3600000,d:86400000,w:604800000}[unit]??NaN);}
export function isContiguous(previous,next,interval){return next.time-previous.time===intervalMs(interval);}
export function parseKline(row){const v={time:Number(row[0]),open:Number(row[1]),high:Number(row[2]),low:Number(row[3]),close:Number(row[4]),volume:Number(row[5])};
 if(!Number.isFinite(v.time)||!Number.isFinite(v.open)||!Number.isFinite(v.high)||!Number.isFinite(v.low)||!Number.isFinite(v.close)||!Number.isFinite(v.volume)||v.time<0||v.low>Math.min(v.open,v.close)||v.high<Math.max(v.open,v.close)||v.volume<0)throw Error('Borsadan geçersiz OHLCV verisi alındı.');
 return v;
}
export function sortedUnique(candles){return [...new Map(candles.map(c=>[c.time,c])).values()].sort((a,b)=>a.time-b.time);}
export function findGaps(candles,interval){const gaps=[];for(let i=1;i<candles.length;i++)if(!isContiguous(candles[i-1],candles[i],interval))gaps.push([candles[i-1].time,candles[i].time]);return gaps;}
async function safeJson(url,signal){
 const request=new AbortController();
 const forwardAbort=()=>request.abort();
 if(signal?.aborted)throw abortError();
 signal?.addEventListener('abort',forwardAbort,{once:true});
 const timer=setTimeout(()=>request.abort(),12000);
 try{
  const response=await fetch(url,{signal:request.signal,cache:'no-store',headers:{Accept:'application/json'}});
  if(!response.ok)throw Error(`Borsa HTTP ${response.status}`);
  const data=await response.json();
  if(data&&typeof data==='object'&&!Array.isArray(data)&&typeof data.code==='number'&&data.code<0)throw Error(`Borsa: ${data.msg||data.code}`);
  return data;
 }catch(error){
  if(error.name==='AbortError'&&!signal?.aborted)throw Error('Borsa isteği 12 saniyede yanıt vermedi');
  throw error;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',forwardAbort);}
}
export class MarketFeed{
 constructor({onStatus,onData,onPrice,onError}={}){this.onStatus=onStatus||(()=>{});this.onData=onData||(()=>{});this.onPrice=onPrice||(()=>{});this.onError=onError||(()=>{});this.generation=0;this.bars=[];this.connected=false;this.backoff=1000;this.socket=null;this.timer=null;this.watchdog=null;this.abort=null;this.inFlight=false;this.lastPacket=0;this.tickSize=null;this.serverTime=null;}
 stop(){++this.generation;this.abort?.abort();this.socket?.close();clearTimeout(this.timer);clearInterval(this.watchdog);this.socket=null;this.timer=null;this.watchdog=null;this.abort=null;this.connected=false;this.inFlight=false;this.bars=[];this.tickSize=null;}
 start({market='spot',symbol='BTCUSDT',interval='5m'}){this.stop();const sym=symbol.trim().toUpperCase();if(!/^[A-Z0-9]{5,20}$/.test(sym)||!MARKETS[market]||!TIMEFRAMES.includes(interval)||(market==='futures'&&interval==='1s')){this.onStatus('error','Sembol veya zaman aralığı geçersiz');return;}
 this.options={market,symbol:sym,interval};this._bootstrap(this.generation);}
 async _request(route,params={},signal){const cfg=MARKETS[this.options.market],qs=new URLSearchParams(params).toString(),urls=[cfg.rest,...cfg.alternates].map(base=>base+route+(qs?'?'+qs:''));let err;
 for(const url of urls){if(signal?.aborted)throw abortError();try{return await safeJson(url,signal);}catch(e){if(e.name==='AbortError')throw e;err=e;}}
 throw err||Error('Piyasa verisi alınamadı');}
 async _bootstrap(g){clearTimeout(this.timer);this.timer=null;this.onStatus('loading','Gerçek geçmiş mumlar alınıyor');this.abort?.abort();this.abort=new AbortController();const signal=this.abort.signal;
 try{const o=this.options,meta=await this._request('/exchangeInfo',{symbol:o.symbol},signal);if(g!==this.generation)return;
 const instrument=meta.symbols?.find(s=>s.symbol===o.symbol&&s.status==='TRADING');const tick=Number(instrument?.filters?.find(f=>f.filterType==='PRICE_FILTER')?.tickSize);
 if(!instrument||!Number.isFinite(tick)||tick<=0)throw Error('Aktif parite/tick size doğrulanamadı.');this.tickSize=tick;
 const clock=await this._request('/time',{},signal);if(!Number.isFinite(Number(clock.serverTime)))throw Error('Borsa saatine erişilemiyor.');this.serverTime=Number(clock.serverTime);
 let records=[],endTime=null;
 for(let page=0;page<3;page++){const params={symbol:o.symbol,interval:o.interval,limit:1000};if(endTime!==null)params.endTime=endTime;
 const raw=await this._request('/klines',params,signal);if(g!==this.generation)return;
 if(!Array.isArray(raw))throw Error('Mum veri biçimi beklenmedik.');const closed=raw.filter(row=>Number(row[6])<this.serverTime).map(parseKline);records.push(...closed);
 if(raw.length<1000||!closed.length)break;endTime=Number(raw[0][0])-1;if(!Number.isFinite(endTime)||endTime<=0)break;
 }
 this.bars=sortedUnique(records).slice(-3000);
 if(!this.bars.length)throw Error('Bu piyasa ve periyotta doğrulanmış mum bulunamadı.');
 const gaps=findGaps(this.bars,o.interval);if(gaps.length)throw Error(`Veride ${gaps.length} eksik zaman aralığı tespit edildi; sinyal üretimi durduruldu.`);
 this.onData(this.bars,this.tickSize,{historical:true});this.backoff=1000;this._connect(g);
 }catch(err){if(g!==this.generation||err.name==='AbortError')return;this.connected=false;this.onStatus('error',`Veri bağlantısı başarısız: ${err.message}`);this.onError(err);this._scheduleReconnect(g);}}
 _connect(g){if(g!==this.generation)return;const {market,symbol,interval}=this.options;this.onStatus('loading','Canlı WebSocket bağlantısı kuruluyor');
 const ws=new WebSocket(MARKETS[market].socket+symbol.toLowerCase()+'@kline_'+interval);this.socket=ws;
 ws.onopen=()=>{if(g!==this.generation){ws.close();return;}this.connected=true;this.backoff=1000;this.lastPacket=Date.now();this.onStatus('live','Canlı • kapanmış mumlar');clearInterval(this.watchdog);this.watchdog=setInterval(()=>{if(Date.now()-this.lastPacket>90000){this.onStatus('warning','Akış bayatladı • yeniden bağlanılıyor');ws.close();}},15000);};
 ws.onmessage=e=>{if(g!==this.generation)return;this.lastPacket=Date.now();let data;try{data=JSON.parse(e.data);}catch{return;}const k=data.k;if(!k||k.s!==symbol||k.i!==interval)return;const lastPrice=Number(k.c);if(Number.isFinite(lastPrice))this.onPrice(lastPrice,k.x===true);
 if(!k.x)return;
 let bar;try{bar=parseKline([k.t,k.o,k.h,k.l,k.c,k.v]);}catch(err){this.onError(err);return;}
 const prev=this.bars.at(-1);if(!prev)return;
 if(bar.time>prev.time&&!isContiguous(prev,bar,interval)){this.connected=false;this.onStatus('warning','Eksik mum • borsa geçmişiyle eşitleniyor');this._recover(g);return;}
 if(bar.time<prev.time)return;
 if(bar.time===prev.time){this.bars[this.bars.length-1]=bar;}else this.bars.push(bar);
 if(this.bars.length>3000)this.bars.shift();
 this.onData(this.bars,this.tickSize,{historical:false});
 };
 ws.onerror=()=>{if(g===this.generation)this.onStatus('warning','Borsa akışında hata • tekrar denenecek');};
 ws.onclose=()=>{if(g!==this.generation)return;this.connected=false;clearInterval(this.watchdog);this.onStatus('offline','Bağlantı kesildi • otomatik yeniden bağlanıyor');this._scheduleReconnect(g);};
 }
 async _recover(g){if(this.inFlight||g!==this.generation)return;this.inFlight=true;
 // Clean up websocket before historical REST reconciliation. A new socket will be opened after bootstrap.
 if(this.socket){this.socket.onclose=null;this.socket.close();this.socket=null;}try{await this._bootstrap(g);}finally{this.inFlight=false;}}
 _scheduleReconnect(g){if(g!==this.generation)return;clearTimeout(this.timer);const wait=this.backoff;this.backoff=Math.min(this.backoff*2,30000);
 this.timer=setTimeout(()=>{if(g!==this.generation)return;this._bootstrap(g);},wait);}
}