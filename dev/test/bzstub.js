window.__installBz=function(){
 const D={
  bz_check:[
   {order_id:"o1",point:"Сергели",d:"2026-10-20",t:"2026-10-20T07:21:11Z",num:"010002000216",type:"Продажа",total:280000,paid:280000,debt:0,pays:[{n:"Наличные",s:280000}],items:[{n:"Линзы сергели",sku:"BIY-92686",c:"Линзы",q:2,rq:0,price:50000,sum:100000,disc:0},{n:"Дет. Оправы",sku:"QBE-40287",c:"",q:1,rq:0,price:180000,sum:180000,disc:0}],seller:"Zufar"},
   {order_id:"o2",point:"Яшнабад",d:"2026-10-19",t:"2026-10-19T08:00:00Z",num:"010001090999",type:"Продажа",total:630000,paid:630000,debt:0,pays:[{n:"Наличные",s:630000}],items:[{n:"Cerruti",sku:"CR1",c:"Оправы",q:1,rq:0,price:280000,sum:280000,disc:0},{n:"Линзы",sku:"L1",c:"Линзы",q:2,rq:0,price:175000,sum:350000,disc:0}],seller:"Севара"},
   {order_id:"o3",point:"Яшнабад",d:"2026-10-19",t:"2026-10-19T09:00:00Z",num:"010001091000",type:"Продажа",total:999000,paid:999000,debt:0,pays:[{n:"Карта",s:999000}],items:[{n:"Tom Ford",sku:"TF",c:"Оправы",q:1,rq:0,price:999000,sum:999000,disc:0}],seller:"Севара"},
   {order_id:"o4",point:"Сергели",d:"2026-10-19",t:"2026-10-19T06:58:53Z",num:"010001090216",type:"Продажа",total:200000,paid:200000,debt:0,pays:[{n:"Наличные",s:200000}],items:[{n:"Линзы сергели",sku:"BIY-92686",c:"Линзы",q:2,price:100000,sum:200000}],seller:"Zufar"}
  ],
  bz_stock:[
   {d:"2026-10-19",point:"Сергели",sku:"QBE-40287",q:21,at:"2026-10-19T12:00:00Z"},{d:"2026-10-19",point:"Сергели",sku:"1000000026",q:66,at:"2026-10-19T12:00:00Z"},{d:"2026-10-19",point:"Склад",sku:"OU-TR-200",q:400,at:"2026-10-19T12:00:00Z"},
   {d:"2026-10-20",point:"Сергели",sku:"QBE-40287",q:20,at:"2026-10-20T12:00:00Z"},{d:"2026-10-20",point:"Сергели",sku:"1000000026",q:60,at:"2026-10-20T12:00:00Z"},{d:"2026-10-20",point:"Склад",sku:"OU-TR-200",q:385,at:"2026-10-20T12:00:00Z"},{d:"2026-10-20",point:"Сергели",sku:"OU-TR-200",q:15,at:"2026-10-20T12:00:00Z"}
  ],
  bz_product:[{sku:"QBE-40287",name:"Дет. Оправы",cat:"",prices:{"Сергели":180000},cp:40000},{sku:"1000000026",name:"Megeson.",cat:"Очки и оправы",prices:{"Сергели":190000},cp:47000},{sku:"OU-TR-200",name:"Оправа уни 200к · Пластик TR",cat:"Оправы",prices:{"Сергели":200000,"Склад":200000},cp:40621}],
  bz_transfer:[{id:"tr1",num:"1000007",name:"Трансфер",created:"2026-10-20T05:00:00Z",accepted:"2026-10-20T06:00:00Z",d:"2026-10-20",from_point:"Склад",to_point:"Сергели",status:"принят",sent:15,arrived:15,retail:3000000,items:[{n:"Оправа уни 200к · Пластик TR",sku:"OU-TR-200",sent:15,arr:15,price:200000}],by_name:"Dilyorbek"},
   {id:"tr2",num:"1000003",name:"Трансфер",created:"2026-10-08T05:00:00Z",accepted:null,d:"2026-10-08",from_point:"Склад",to_point:"Премиум",status:"в пути",sent:1046,arrived:0,retail:9,items:[],by_name:"Dilyorbek"}]
 };
 const orig=window.__sb.from.bind(window.__sb);
 window.__sb.from=function(t){if(!D[t])return orig(t);let rows=D[t].slice(),sel=null;const api={select(c){sel=c;return api},gte(k,v){rows=rows.filter(r=>r[k]>=v);return api},lte(k,v){rows=rows.filter(r=>r[k]<=v);return api},eq(k,v){rows=rows.filter(r=>r[k]===v);return api},order(){return api},range(a,b){return Promise.resolve({data:rows.slice(a,b+1),error:null})}};return api};
 window.__sb.rpc=async n=>{const m=new Map();D.bz_stock.forEach(r=>{if(!m.has(r.d))m.set(r.d,r.at)});return {data:[...m].map(([d,at])=>({d,at})),error:null}};
 window.__sb.functions={invoke:async()=>({data:{ok:true}})};
};
