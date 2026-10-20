const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require((process.env.LX_QA_NODE_MODULES||path.join(__dirname,'tools/catalog-qa/node_modules'))+'/playwright');
const output=process.env.LX_QA_OUTPUT||'/tmp/lx-next-qa';fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.LX_QA_CHROMIUM,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
 await page.addInitScript(()=>{
  window.qaNextCalls=[];window.qaNextAal='aal1';window.qaNextFactor=false;window.qaNextConfigured=false;window.qaNextDelay=0;
  const client={from(){const q={};for(const k of ['select','eq','order','limit','range','upsert','insert','update','delete'])q[k]=()=>q;q.maybeSingle=async()=>({data:null,error:null});q.then=(ok,bad)=>Promise.resolve({data:[],error:null}).then(ok,bad);return q;},
   channel(){const c={on:()=>c,subscribe:()=>c};return c;},removeChannel:async()=>{},storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})},
   functions:{invoke:async()=>({data:{items:[]},error:null})},
   async rpc(name,args){qaNextCalls.push({name,args});if(name==='lx_next_return_interest')return {data:{accepted:true},error:null};
    if(name==='lx_next_punchpay_status'||name==='lx_next_save_punchpay'){
     if(qaNextDelay)await new Promise(r=>setTimeout(r,qaNextDelay));
     if(qaNextAal!=='aal2')return {data:null,error:{message:'MFA_REQUIRED'}};
     if(name==='lx_next_save_punchpay')qaNextConfigured=!!args.p_api_key;
     return {data:{environment:args.p_environment,documentation_url:'https://docs.example.invalid',credential_configured:qaNextConfigured,enabled:false,audit:[]},error:null};
    }
    if(name==='lx_next_admin_status')return {data:{users:7,pending:2,catalog:2374,storage_objects:435},error:null};
    return {data:[],error:null};
   },
   auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
    mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:qaNextAal},error:null}),listFactors:async()=>({data:{totp:qaNextFactor?[{id:'qa-factor',status:'verified'}]:[]},error:null}),
     enroll:async()=>({data:{id:'qa-factor',totp:{qr_code:'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="white"/></svg>'}},error:null}),
     challengeAndVerify:async({factorId,code})=>{if(factorId!=='qa-factor'||code!=='123456')return {error:{message:'invalid code'}};qaNextAal='aal2';qaNextFactor=true;return {data:{},error:null};}
    }
   }
  };window.qaNextDb=client;window.supabase={createClient:()=>client};
 });
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>LX.nextConsole&&LX.maintenance);
 assert(await page.locator('#lxMaintenance41').isVisible());
 await page.locator('#lxNextInterestEmail').fill('interested@example.invalid');await page.locator('#lxNextInterest button').click();
 assert.equal(await page.evaluate(()=>qaNextCalls.filter(x=>x.name==='lx_next_return_interest').length),0,'Consent is required');
 await page.locator('#lxNextInterestConsent').check();await page.locator('#lxNextInterest button').click();
 await page.waitForFunction(()=>document.getElementById('lxNextInterestStatus').textContent.includes('registrado'));
 const args=await page.evaluate(()=>qaNextCalls.find(x=>x.name==='lx_next_return_interest').args);assert.equal(args.p_consent,true);
 await page.screenshot({path:path.join(output,'next-maintenance-consent-390.png'),fullPage:true});
 await page.evaluate(()=>{
  LX.state.user={id:'00000000-0000-4000-8000-000000000001',name:'Proprietário QA',email:'owner@example.invalid',admin:true,adminRole:'owner',approved:true,emailConfirmed:true,approvalStatus:'approved'};
  LX.cloud.user=()=>({id:LX.state.user.id});LX.cloud.isAdmin=()=>true;LX.cloud.db=()=>qaNextDb;LX.maintenance.sync();LX.ui.show('admin');LX.nextConsole.render('nextPayments');
 });
 const subscriptionsBefore=await page.evaluate(()=>JSON.stringify(LX.data.subscriptions()));
 await page.evaluate(()=>LX.choosePlan('Mensal'));
 assert.equal(await page.evaluate(()=>JSON.stringify(LX.data.subscriptions())),subscriptionsBefore,'Choosing a plan cannot activate Premium');
 await page.waitForFunction(()=>document.getElementById('lxNextStatus').textContent.includes('código de autenticação'));
 assert(await page.locator('#lxNextSavePayment').isDisabled());
 await page.locator('#lxNextPaymentSecurity').click();await page.locator('#lxNextEnrollMfa').click();
 await page.locator('#lxNextMfaCode').fill('000000');await page.locator('#lxNextMfaVerify button').click();
 await page.waitForFunction(()=>document.getElementById('lxNextStatus').textContent.includes('Código não confirmado'));
 await page.locator('#lxNextMfaCode').fill('123456');await page.locator('#lxNextMfaVerify button').click();
 await page.waitForFunction(()=>document.getElementById('lxNextMfaBody').textContent.includes('está confirmado'));
 await page.locator('#lxNextSecurityBack').click();await page.waitForFunction(()=>!document.getElementById('lxNextSavePayment').disabled);
 await page.locator('#lxNextApiKey').fill('qa-secret-do-not-persist');await page.locator('#lxNextPaymentForm').evaluate(form=>form.requestSubmit());
 await page.waitForFunction(()=>document.getElementById('lxNextStatus').textContent.includes('Configuração salva'));
 assert.equal(await page.locator('#lxNextApiKey').inputValue(),'');
 assert.equal(await page.evaluate(()=>JSON.stringify(localStorage).includes('qa-secret-do-not-persist')),false);
 assert.equal(await page.locator('#adminMain').textContent().then(x=>x.includes('qa-secret-do-not-persist')),false);
 for(const width of [320,390,820,1280,1920]){
  await page.setViewportSize({width,height:1000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No horizontal overflow at '+width);
  await page.screenshot({path:path.join(output,'next-payments-'+width+'.png'),fullPage:true});
 }
 await page.evaluate(()=>{qaNextDelay=500;LX.nextConsole.render('nextPayments');LX.admin.render('dashboard');});
 await page.waitForTimeout(700);assert.equal(await page.locator('#lxNextPaymentForm').count(),0,'Late response never overwrites the next page');
 await page.evaluate(()=>{LX.state.user.adminRole='editor';LX.nextConsole.render('nextPayments');});
 assert.equal(await page.locator('#lxNextPaymentForm').count(),0,'Editor cannot open the owner panel');
 assert.deepEqual(errors,[]);await browser.close();
 console.log('PASS Next browser: consent, owner restriction, MFA setup/verification, masked credential saving, storage privacy, navigation race and responsive 320/390/820/1280/1920 layouts. Server calls use fixtures; no real credentials or charges.');
})().catch(error=>{console.error(error);process.exit(1)});
