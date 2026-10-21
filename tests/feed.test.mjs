import test from 'node:test';
import assert from 'node:assert/strict';
import {MarketFeed} from '../src/feed.mjs';

const row=(time,open=100)=>[time,String(open),String(open+2),String(open-1),String(open+1),'100',time+59999];
const tick=(time,x)=>JSON.stringify({k:{s:'BTCUSDT',i:'1m',t:time,o:'102',h:'105',l:'101',c:'104',v:'150',x}});
const turn=()=>new Promise(ok=>setImmediate(ok));

// All market responses below are deterministic test fixtures. None ship to the app or UI.
test('live feed never counts an open candle; accepts one closed candle and detects a missing interval',async()=>{
 const former=globalThis.WebSocket;
 const sockets=[];
 class TestSocket {
  constructor(url){this.url=url;sockets.push(this);}
  close(){this.onclose?.();}
 }
 globalThis.WebSocket=TestSocket;
 const data=[],prices=[],statuses=[],feed=new MarketFeed({onStatus:(s,m)=>statuses.push([s,m]),onData:(b,t,meta)=>data.push({count:b.length,meta}),onPrice:(p,closed)=>prices.push({p,closed})});
 feed._request=async route=>{
  if(route==='/exchangeInfo')return {symbols:[{symbol:'BTCUSDT',status:'TRADING',filters:[{filterType:'PRICE_FILTER',tickSize:'0.01'}]}]};
  if(route==='/time')return {serverTime:600000};
  if(route==='/klines')return [row(60000),row(120000),row(180000)];
  throw Error('Unexpected request '+route);
 };
 try{
  feed.start({market:'spot',symbol:'BTCUSDT',interval:'1m'});
  await turn();await turn();
  assert.equal(data.length,1);
  assert.deepEqual(data[0],{count:3,meta:{historical:true}});
  assert.equal(sockets.length,1);
  const ws=sockets[0];ws.onopen();
  ws.onmessage({data:tick(240000,false)});
  assert.equal(data.length,1,'open kline must not produce signals');
  assert.deepEqual(prices.at(-1),{p:104,closed:false});
  ws.onmessage({data:tick(240000,true)});
  assert.equal(data.length,2);
  assert.deepEqual(data.at(-1),{count:4,meta:{historical:false}});
  ws.onmessage({data:tick(240000,true)});
  assert.equal(data.at(-1).count,4,'duplicate closed kline must not add a candle');
  ws.onmessage({data:tick(360000,true)});
  assert.ok(statuses.some(([s,msg])=>s==='warning'&&msg.includes('Eksik mum')));
  await turn();await turn();
  assert.equal(data.at(-1).meta.historical,true,'recovery must rebootstrap from source');
 }finally{feed.stop();globalThis.WebSocket=former;}
});