// Exercise the real demo pages/state in WeChat. No HTTP fixtures or cloud media.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const automator = require(process.argv[2] || 'miniprogram-automator');
const out = path.resolve(process.env.XSA_VERIFICATION_DIR || path.join(__dirname, '../docs/verification/live-demo'));
async function main() {
  const mp = await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});
  const errors=[];
  mp.on('exception', e=>{errors.push(e.message);console.error('WeChat:',e.message)});
  const capture=process.argv.includes('--screenshots');
  let page;
  const settle=async()=>{await page.waitFor(150)};
  const click=async(scope,selector)=>{
    const el=await scope.$(selector);
    if(!el){console.error('Selector context',selector,JSON.stringify(await scope.data()),await scope.wxml())}
    assert.ok(el,`missing ${selector}`);
    const button=el.tagName==='component'?await el.$('button'):el;
    assert.ok(button,`missing native button for ${selector}`);
    await button.tap(); await settle();
  };
  const markup=async()=>await (await page.$('.live-page')).wxml();
  const shot=async(name)=>{
    if(!capture)return;
    const p=await page.$('.live-demo-controls');
    if(p && await p.$('picker'))await click(p,'.demo-toggle');
    await mp.callWxMethod('hideToast');
    await mp.screenshot({path:path.join(out,name+'.png')});
  };
  const goto=async(name)=>{page=await mp.redirectTo('/pagesSub/live/'+name+'?id=1&mode=demo');await page.waitFor(350)};
  const panel=async()=>{
    const p=await page.$('.live-demo-controls'); assert.ok(p);
    if(!(await p.$('picker')))await click(p,'.demo-toggle');
    return p;
  };
  const role=async(uid)=>{const p=await panel();await (await p.$('picker')).trigger('change',{value:uid-1});await settle()};
  const action=async(selector)=>await click(await panel(),selector);
  const next=async()=>{await action('.demo-skip');await action('.demo-next')};
  try {
    await fs.mkdir(out,{recursive:true});
    // Guards are spies, not canned business responses; any hit fails the run.
    await mp.evaluate(()=>{getApp().__xsaDemoUnexpected=[]});
    for(const method of ['request','connectSocket','setStorageSync','createLivePusherContext','getRecorderManager']) {
      await mp.mockWxMethod(method,function(_options,name){getApp().__xsaDemoUnexpected.push(name);return {statusCode:503,data:{}}},method);
    }
    await mp.mockWxMethod('showModal',{confirm:true,cancel:false});
    page=await mp.reLaunch('/pagesSub/live/lobby?mode=demo');
    await page.waitFor(800);
    assert.match(await (await page.$('.live-title')).text(),/直播相亲/);
    assert.equal((await page.$$('.live-card')).length,1);
    const controls=await panel();
    const heading=await controls.$('.demo-heading');
    assert.equal(await heading.style('flex-direction'),'row');
    await action('.demo-reset');page=await mp.currentPage();await page.waitFor(350);
    await shot('01-lobby');
    await goto('detail');await click(page,'.live-reserve');
    await (await page.$('checkbox-group')).trigger('change',{value:['agree']});await settle();
    await click(page,'.live-accept');assert.match(await markup(),/更新本场授权资料/);
    await shot('02-detail');
    await goto('backstage');await click(page,'.demo-device');await click(page,'.live-check-in');
    assert.match(await markup(),/模拟检查已完成/);await shot('03-backstage');
    console.log('PASS invitation, reservation and simulated check-in');
    await goto('room');await action('.demo-ready');await action('.demo-next');
    assert.match(await markup(),/自我介绍/);await shot('05-intro');
    await action('.demo-pause');assert.match(await markup(),/流程暂停/);await action('.demo-pause');
    await next();assert.match(await markup(),/红娘问答/);await shot('06-question');
    await next();await role(4);
    let round=await page.$('.live-round-controls');
    await click(round,'.live-light');assert.match(await round.wxml(),/撤回亮灯/);await click(round,'.live-light');
    await click(round,'.live-special');assert.match(await round.wxml(),/撤回特别心动/);await click(round,'.live-special');
    await shot('07-interest');await next();await role(4);
    round=await page.$('.live-round-controls');
    for(const choice of (await round.$$('.live-choice')).slice(0,3))await choice.tap();
    await settle();assert.equal((await round.$$('.selected')).length,3);
    await click(round,'.live-choose-main');await shot('08-main-choice');
    await role(8);round=await page.$('.live-round-controls');await click(round,'.live-choose-yes');await shot('09-candidate-choice');
    await role(12);assert.doesNotMatch(await markup(),/提交我的选择|愿意与主嘉宾交流/);await shot('11-spectator');
    await action('.demo-preset');await next();assert.match(await markup(),/公开交流队列/);await shot('12-exchanges');
    await next();await next();await next();await next();
    assert.match(await markup(),/第 2 \/ 4 轮/);
    console.log('PASS round 1: lights, privacy, three ordered exchanges and pause');
    for(let i=0;i<3;i++)await next();
    await action('.demo-preset');await next();assert.match(await markup(),/本轮没有互选组合/);await shot('13-no-match');await next();
    for(let i=0;i<3;i++)await next();
    await action('.demo-preset');await next();await next();await role(11);
    round=await page.$('.live-round-controls');await click(round,'.live-withdraw');await settle();
    assert.match(await markup(),/已退出/);await next();
    for(let i=0;i<3;i++)await next();
    await action('.demo-preset');await next();
    const exchangeText=await markup();assert.match(exchangeText,/男三 · 陈川/);
    await next();await next();await action('.demo-next');assert.match(await markup(),/已结束/);
    console.log('PASS rounds 2–4: no match, withdrawal, deduplication and end');
    await role(4);await goto('results');let follow=await page.$('.live-demo-follow-up');
    assert.equal((await follow.$$('.demo-apply')).length,3);await shot('14-results');
    await click(follow,'.demo-apply');
    await click(follow,'.demo-confirm-apply');
    assert.doesNotMatch(await markup(),/打开演示聊天/);
    await shot('15-application');
    let apps=await follow.$('.demo-application-tabs');
    await (await (await apps.$('.application-sheet')).$('.close-btn')).tap();await settle();
    await role(8);follow=await page.$('.live-demo-follow-up');await click(follow,'.demo-applications');
    apps=await follow.$('.demo-application-tabs');await click(apps,'.application-accept');
    assert.match(await markup(),/打开演示聊天/);await click(follow,'.demo-open-chat');
    await (await follow.$('.demo-chat-input')).input('很高兴听到你的生活故事。');await settle();await click(follow,'.demo-send');
    assert.match(await follow.wxml(),/很高兴听到你的生活故事。/);await shot('16-chat');
    await (await (await follow.$('.demo-chat-sheet')).$('.close-btn')).tap();await settle();
    await role(4);follow=await page.$('.live-demo-follow-up');await click(follow,'.demo-open-chat');
    assert.match(await follow.wxml(),/很高兴听到你的生活故事。/);
    await (await (await follow.$('.demo-chat-sheet')).$('.close-btn')).tap();await settle();
    await click(follow,'.demo-apply');await click(follow,'.demo-confirm-apply');
    apps=await follow.$('.demo-application-tabs');await (await (await apps.$('.application-sheet')).$('.close-btn')).tap();await settle();
    await role(9);follow=await page.$('.live-demo-follow-up');await click(follow,'.demo-applications');
    apps=await follow.$('.demo-application-tabs');await click(apps,'.application-reject');
    assert.match(await apps.wxml(),/已婉拒/);assert.equal((await follow.$$('.demo-open-chat')).length,0);
    console.log('PASS applications, recipient consent, two-sided chat and rejection');
    await role(13);page=await mp.redirectTo('/pagesSub/live/manage?mode=demo');await page.waitFor(350);
    assert.match(await markup(),/固定演示名单/);await shot('04-manage');
    await goto('lobby');
    assert.deepEqual(await mp.evaluate(()=>getApp().__xsaDemoUnexpected),[],'demo must stay off real transports and identity');
    assert.deepEqual(errors,[]);
    const info=await mp.systemInfo();
    await fs.writeFile(path.join(out,'devtools-result.json'),JSON.stringify({passed:true,date:new Date().toISOString(),width:info.windowWidth,height:info.windowHeight,
      scope:'Actual WeChat demo UI: four rounds, after-session consent/chat; no business API fixtures, not real media',errors:errors},null,2));
    console.log('PASS actual WeChat demo flow');
  } finally {
    for(const method of ['request','connectSocket','setStorageSync','createLivePusherContext','getRecorderManager','showModal'])await mp.restoreWxMethod(method);
    await mp.evaluate(()=>{delete getApp().__xsaDemoUnexpected});
    await mp.disconnect();
  }
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
