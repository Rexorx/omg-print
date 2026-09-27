import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const fullSource = fs.readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const source = fullSource.slice(0, fullSource.indexOf('const ENTERPRISE_SUPABASE_URL'));
const flush = async () => { for (let i=0;i<30;i++) await Promise.resolve(); };
const plans = ['basic-monthly','basic-annual','team-monthly','team-annual'];
function fixture() {
  const nodes = new Map(), timers = new Map(), calls = [], carts = new Map(), navigations = [];
  let now='2026-09-27T18:00:00Z', behavior;
  const element = (id) => {
    if (!nodes.has(id)) nodes.set(id,{ textContent:'', disabled:false, open:false, handlers:{}, addEventListener(type,fn){this.handlers[type]=fn;}, showModal(){this.open=true;},close(){this.open=false;} });
    return nodes.get(id);
  };
  const buttons=plans.map(plan=>Object.assign(element(plan),{dataset:{plan},textContent:plan}));
  const context=vm.createContext({ URL,Intl,AbortController,console:{info(){}},
    Date:class extends Date{static now(){return new Date(now).getTime();}},
    document:{getElementById:element,querySelectorAll:s=>s==='[data-plan]'?buttons:[],body:{classList:{add(){}}}},
    window:{setTimeout(fn){const id=Symbol();timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},setInterval(){},clearInterval(){},location:{assign(url){navigations.push(url);}}},
    fetch:async(url,options)=>{
      const request=JSON.parse(options.body);calls.push({url,options,request});
      const response=()=>{
        if(request.query.startsWith('mutation')){
          const input=request.variables.input, p=plans.find(id=>api.PLANS[id].variantId===input.lines[1].merchandiseId), promo=input.discountCodes.length>0;
          const prices=[promo?2500:4500,promo?api.CHECKOUT_OFFERS[p].promo:api.CHECKOUT_OFFERS[p].regular];
          const money=amount=>({amount:amount.toFixed(2),currencyCode:'MXN'});
          const cart={id:`synthetic-${carts.size+1}`,checkoutUrl:'https://www.omaigad.com.mx/checkouts/synthetic',discountCodes:input.discountCodes.map(code=>({code,applicable:true})),cost:{subtotalAmount:money(prices[0]+prices[1]),totalAmount:money((prices[0]+prices[1])*1.16)},lines:{nodes:input.lines.map((line,i)=>({__typename:'CartLine',id:`line-${i}`,quantity:line.quantity,merchandise:{id:line.merchandiseId},sellingPlanAllocation:line.sellingPlanId?{sellingPlan:{id:line.sellingPlanId}}:null,cost:{totalAmount:money(prices[i])}})),pageInfo:{hasNextPage:false}}};
          carts.set(cart.id,cart);return {data:{cartCreate:{cart:structuredClone(cart),userErrors:[],warnings:[]}}};
        }
        return {data:{cart:structuredClone(carts.get(request.variables.id))}};
      };
      if(behavior)return behavior(request,response,options);
      return {ok:true,json:async()=>response()};
    }
  });
  vm.runInContext(source,context);
  const api=vm.runInContext('({openPlanCart,PLANS,CHECKOUT_OFFERS,validateInitialCart,rereadCart,confirmedCarts})',context);
  return {...api,element,buttons,calls,carts,navigations,setBehavior(fn){behavior=fn;},setNow(s){now=s;},tick(){const f=[...timers.values()];timers.clear();f.forEach(fn=>fn());},mutations(){return calls.filter(c=>c.request.query.startsWith('mutation'));}};
}

for(const plan of plans)test(`${plan}: creates two lines together, validates price and rereads before summary`,async()=>{
  const f=fixture();await f.openPlanCart(plan);
  assert.equal(f.mutations().length,1);assert.equal(f.calls.length,2);assert.equal(f.element('checkoutSummary').open,true);
  const input=f.mutations()[0].request.variables.input;
  assert.equal(input.lines.length,2);assert.equal(input.lines[0].sellingPlanId,undefined);assert.equal(input.lines[1].sellingPlanId,f.PLANS[plan].sellingPlanId);
  assert.deepEqual(input.discountCodes,[...f.CHECKOUT_OFFERS[plan].codes]);
  assert.ok(f.calls.every(c=>c.options.credentials==='omit'&&!c.options.headers.Authorization));
});
test('double click and repeat opening reuse one cart, all plan buttons are protected',async()=>{
  const f=fixture();const promise=f.buttons[0].handlers.click();assert.ok(f.buttons.every(b=>b.disabled));
  await f.buttons[1].handlers.click();await promise;await f.openPlanCart('basic-monthly');
  assert.equal(f.mutations().length,1);assert.ok(f.buttons.every(b=>!b.disabled));assert.equal(f.carts.size,1);
});
test('continue performs another read; no payment operation exists',async()=>{
  const f=fixture();await f.openPlanCart('basic-monthly');await f.element('continueCheckout').handlers.click();
  assert.equal(f.calls.length,3);assert.equal(f.mutations().length,1);assert.equal(f.navigations.length,1);
});
test('setup removed elsewhere blocks checkout and preserves all remaining lines',async()=>{
  const f=fixture();await f.openPlanCart('basic-monthly');const cart=[...f.carts.values()][0];cart.lines.nodes.shift();
  await f.element('continueCheckout').handlers.click();assert.equal(f.navigations.length,0);assert.match(f.element('checkoutSummaryError').textContent,/implementación y una licencia/);
  await assert.rejects(f.openPlanCart('basic-monthly'));assert.equal(cart.lines.nodes.length,1);assert.equal(f.mutations().length,1);
});
for(const kind of ['selling-plan','variant','quantity','recurring-setup','extra','missing-setup','missing-license','price','discount','subtotal','currency','pagination','checkout-host'])test(`rejects incompatible ${kind}`,async()=>{
  const f=fixture();f.setBehavior(async(req,normal)=>{const data=normal();const c=data.data.cartCreate?.cart||data.data.cart;
    if(kind==='selling-plan')c.lines.nodes[1].sellingPlanAllocation.sellingPlan.id='wrong';
    if(kind==='variant')c.lines.nodes[1].merchandise.id='wrong';
    if(kind==='quantity')c.lines.nodes[0].quantity=2;
    if(kind==='recurring-setup')c.lines.nodes[0].sellingPlanAllocation={sellingPlan:{id:'wrong'}};
    if(kind==='extra')c.lines.nodes.push(c.lines.nodes[0]);
    if(kind==='missing-setup')c.lines.nodes.shift();if(kind==='missing-license')c.lines.nodes.pop();
    if(kind==='price')c.lines.nodes[0].cost.totalAmount.amount='4500.00';
    if(kind==='discount')c.discountCodes[0].applicable=false;
    if(kind==='subtotal')c.cost.subtotalAmount.amount='1.00';
    if(kind==='currency')c.cost.totalAmount.currencyCode='USD';
    if(kind==='pagination')c.lines.pageInfo.hasNextPage=true;
    if(kind==='checkout-host')c.checkoutUrl='https://example.invalid/checkout';
    return {ok:true,json:async()=>data};});
  await assert.rejects(f.openPlanCart('basic-monthly'));assert.equal(f.element('checkoutSummary').open,false);assert.equal(f.navigations.length,0);
});
for(const kind of ['user-error','warning','graphql','http','network'])test(`creation ${kind} never opens checkout`,async()=>{
  const f=fixture();f.setBehavior(async(_req,normal)=>{if(kind==='network')throw new Error('network');if(kind==='http')return{ok:false};const data=normal();
    if(kind==='graphql')data.errors=[{}];if(kind==='user-error')data.data.cartCreate.userErrors=[{code:'INVALID'}];if(kind==='warning')data.data.cartCreate.warnings=[{code:'MERCHANDISE_OUT_OF_STOCK'}];return{ok:true,json:async()=>data};});
  await f.buttons[0].handlers.click();assert.equal(f.element('checkoutSummary').open,false);assert.ok(f.element('checkoutError').textContent);
});
test('uncertain create timeout never automatically repeats a mutation, even for another plan',async()=>{
  const f=fixture();f.setBehavior(()=>new Promise(()=>{}));const pending=f.openPlanCart('basic-monthly'), rejected=assert.rejects(pending);
  await flush();f.tick();await rejected;await assert.rejects(f.openPlanCart('team-annual'),/intento anterior/);assert.equal(f.mutations().length,1);
});
test('inactive launch discount has a specific visible explanation and preserves the confirmed cart',async()=>{
  const f=fixture();f.setBehavior(async(_req,normal)=>{const data=normal();data.data.cartCreate.warnings=[{code:'DISCOUNT_CURRENTLY_INACTIVE'}];return{ok:true,json:async()=>data};});
  await f.buttons[0].handlers.click();assert.match(f.element('checkoutError').textContent,/descuento de lanzamiento no está activo en Shopify/);
  assert.equal(f.element('checkoutSummary').open,false);assert.equal(f.navigations.length,0);assert.equal(f.confirmedCarts.size,1);
  f.setBehavior(null);await f.openPlanCart('basic-monthly');assert.equal(f.mutations().length,1);
});
test('a read failure retries only the confirmed cart, never creates another one',async()=>{
  const f=fixture();f.setBehavior(async(req,normal)=>{if(req.query.startsWith('query'))throw new Error('read unavailable');return{ok:true,json:async()=>normal()};});
  await assert.rejects(f.openPlanCart('basic-monthly'));f.setBehavior(null);await f.openPlanCart('basic-monthly');assert.equal(f.mutations().length,1);
});
test('regular offer uses unchanged regular prices with no launch discounts',async()=>{
  const f=fixture();f.setNow('2026-10-02T06:00:00Z');await f.openPlanCart('team-annual');assert.deepEqual(f.mutations()[0].request.variables.input.discountCodes,[]);
  assert.match(f.element('checkoutSetup').textContent,/4,500/);assert.match(f.element('checkoutLicense').textContent,/8,990/);
});
test('offer expiration while summary is open blocks the old promotional checkout',async()=>{
  const f=fixture();await f.openPlanCart('basic-monthly');f.setNow('2026-10-02T06:00:00Z');await f.element('continueCheckout').handlers.click();
  assert.equal(f.navigations.length,0);assert.match(f.element('checkoutSummaryError').textContent,/vigencia/);
});
