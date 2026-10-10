// Real HTTP to the owned --live-business --serve-port 8000 runner. No API fixtures.
// Refuses an existing login and signs out only the synthetic account it logs in.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const automator=require(process.argv[2]||'miniprogram-automator');
const out=path.resolve(process.env.XSA_VERIFICATION_DIR || path.join(__dirname,'../docs/verification/live-business'));
async function main(){
  const health=await fetch('http://127.0.0.1:8000/api/v1/live/v2/resources');
  assert.equal(health.status,401,'live resources must require login');
  const mp=await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});
  const errors=[];let ownedLogin=false,page;
  const until=async(check,label)=>{
    const end=Date.now()+15000;
    while(!(await check())){if(Date.now()>end)throw new Error('Timed out: '+label);await page.waitFor(150)}
  };
  mp.on('exception',e=>{errors.push(e.message);console.error(e.message)});
  const markup=async()=>await (await page.$('.live-page')).wxml();
  const click=async(scope,selector)=>{
    const component=await scope.$(selector);assert.ok(component,'Missing '+selector);
    const button=component.tagName==='component'?await component.$('button'):component;
    assert.ok(button,'Missing native button '+selector);await button.tap();await page.waitFor(180);
  };
  const shot=async(name)=>{await mp.callWxMethod('hideToast');await mp.screenshot({path:path.join(out,name+'.png')})};
  try{
    assert.equal(await mp.evaluate(()=>!!wx.getStorageSync('xsa_access_token')),false,'Preserve existing user login');
    await mp.mockWxMethod('showToast',function(options){getApp().__liveBusinessToast=options.title;return {}});
    await fs.mkdir(out,{recursive:true});
    page=await mp.reLaunch('/pages/auth/register');
    await until(async()=>(await page.$$('input')).length===3,'normal login form');
    console.log('Checking normal login form');
    const inputs=await page.$$('input');
    await inputs[0].input('13900001020');await inputs[1].input('123456');await inputs[2].input('业务演练运营');
    await (await page.$('.gender-item')).tap();
    await (await page.$('.code-btn')).tap();await page.waitFor(500);
    console.log('SMS request clicked');
    await (await page.$('.register-btn')).tap();
    try{await until(async()=>await mp.evaluate(()=>Number(wx.getStorageSync('xsa_user_id'))===1020),'normal login')}
    catch(e){console.error('Login feedback:',await mp.evaluate(()=>getApp().__liveBusinessToast));throw e}
    ownedLogin=true;
    console.log('PASS normal login');
    console.log('Saved entry mode:',await mp.evaluate(()=>wx.getStorageSync('xsa_onboarding_mode')||'unset'));
    await page.waitFor(1200); // Existing login page's scheduled navigation must finish.
    page=await mp.navigateTo('/pagesSub/live/manage');
    console.log('Management page opened');
    try{await until(async()=>!!(await page.$('.live-roster-editor')),'roster editor')}
    catch(e){console.error('Management rendering:',await markup());throw e}
    console.log('Roster editor rendered');
    assert.match(await markup(),/业务演练，无音视频/);
    await (await page.$('input')).input('微信真实业务名单验收');
    const roster=await page.$('.live-roster-editor');
    const assignments=[[0,[1001]],[1,[1002,1003]],[2,[1004,1005,1006,1007]],[3,[1008,1009,1010,1011]],[4,[1012]]];
    for(const [role,ids] of assignments){
      await (await roster.$('picker')).trigger('change',{value:role});
      for(const id of ids){
        console.log('Select synthetic account',id);
        await (await roster.$('input')).input(String(id));
        await click(roster,'.live-roster-search');
        await until(async()=>(await roster.wxml()).includes('业务演练用户'+id),'account search '+id);
        await click(roster,'.live-roster-add');
      }
    }
    console.log('PASS real account search and roster selection');
    const pickers=await roster.$$('picker');
    for(const [i,index] of [1,5,2,6].entries()){
      await pickers[i+1].trigger('change',{value:index});
      const expected='第 '+(i+1)+' 轮：业务演练用户'+(1003+index);
      await until(async()=>(await pickers[i+1].wxml()).includes(expected),'main guest '+(i+1));
      assert.equal(Number(await pickers[i+1].value()),index,'native picker must retain the chosen seat');
    }
    await (await page.$('textarea')).input('独立测试环境真实业务验收。仅展示本人授权资料，未启用音视频，不采集摄像头或麦克风。');
    await shot('01-roster');
    await mp.pageScrollTo(10000);await page.waitFor(180);await shot('01b-roster-order');
    await click(page,'.live-save');
    try{await until(async()=> (await mp.currentPage()).path==='pagesSub/live/room','create session')}
    catch(e){console.error('Create rendering:',await markup());throw e}
    page=await mp.currentPage();
    await until(async()=>(await markup()).includes('微信真实业务名单验收'),'operator room');
    assert.match(await markup(),/业务演练/);assert.equal(await page.$('live-stage'),null);
    let staff=await page.$('.live-staff-controls');
    if(!staff)staff=await page.$('live-staff-panel');
    assert.match(await staff.wxml(),/确认排期/,'operator-only scheduling must be available');
    await click(staff,'.live-schedule');
    const schedulingError=await page.$('.live-error');
    if(schedulingError)throw new Error('Scheduling rejected: '+await schedulingError.text());
    try{await until(async()=>(await markup()).includes('已排期'),'schedule')}
    catch(e){console.error('Scheduling rendering:',await markup());throw e}
    assert.doesNotMatch(await staff.wxml(),/开始业务演练/,'unconfirmed roster cannot start');
    await shot('02-operator');
    await mp.pageScrollTo(10000);await page.waitFor(180);await shot('03-operator-controls');
    await click(staff,'.live-edit');
    await until(async()=>(await mp.currentPage()).path==='pagesSub/live/manage','edit navigation');page=await mp.currentPage();
    await until(async()=>!!(await page.$('input')),'edit form');
    await (await page.$('input')).input('微信真实业务名单验收 · 已修改');
    await click(page,'.live-save');
    await until(async()=>(await mp.currentPage()).path==='pagesSub/live/room','save edit');page=await mp.currentPage();
    await until(async()=>(await markup()).includes('已修改'),'edited title');
    await shot('04-edited');
    const info=await mp.systemInfo();assert.deepEqual(errors,[]);
    await fs.writeFile(path.join(out,'devtools-result.json'),JSON.stringify({passed:true,date:new Date().toISOString(),width:info.windowWidth,
      scope:'Real SMS-provider login, real HTTP account search/create/schedule/edit on temporary MySQL and Redis; media disabled',errors},null,2));
    console.log('PASS WeChat real business: normal login, account search, full roster, schedule, versioned edit; no media');
  }finally{
    if(ownedLogin)await mp.evaluate(async()=>{
      if(Number(wx.getStorageSync('xsa_user_id'))!==1020)return;
      await new Promise(resolve=>wx.request({url:'http://127.0.0.1:8000/api/v1/auth/logout',method:'POST',
        header:{Authorization:'Bearer '+wx.getStorageSync('xsa_access_token')},complete:resolve}));
      for(const key of ['xsa_access_token','xsa_refresh_token','xsa_user_id'])wx.removeStorageSync(key);
    });
    await mp.restoreWxMethod('showToast');
    await mp.evaluate(()=>{delete getApp().__liveBusinessToast});
    await mp.reLaunch('/pagesSub/live/lobby?mode=demo');await mp.disconnect();
  }
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
