// Actual WeChat rendering/interactions with synthetic HTTP fixtures only.
// Does not read/write login storage and never requests real media credentials.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const automator = require(process.argv[2] || 'miniprogram-automator');
const out = path.resolve(__dirname, '../docs/verification/live-trial');
const capture = process.argv.includes('--screenshots');
async function main() {
  const mp = await automator.connect({wsEndpoint:'ws://127.0.0.1:9420'});
  mp.on('exception', error => console.error('WeChat exception:',error.message));
  const original = await mp.currentPage();
  try {
    await fs.mkdir(out,{recursive:true});
    await mp.mockWxMethod('request', function(options) {
      const now = Math.floor(Date.now()/1000);
      const members = [];
      for (let uid=1;uid<=12;uid++) members.push({user_id:uid,role:uid===1?'host':uid<=3?'matchmaker':uid===12?'spectator':'guest',
        group:uid>=4&&uid<=7?'male':uid>=8&&uid<=11?'female':'none',seat:uid>=8?uid-7:uid-3,
        display_name:'合成测试'+uid,introduction:'本人授权展示的测试介绍',attendance:'onstage',on_stage:uid<=4||uid>=8&&uid<=11,hand:false,light_target:null,special_target:null});
      const state={id:1,title:'四轮受邀试点 · 界面测试',scheduled_at:now+3600,status:'live',revision:1,server_time:now,
        notice:'合成界面测试，不连接云音视频。现场资料仅向受邀人员展示，不提供公开回放。',round_index:0,main_id:4,phase:'choice',
        deadline:now+60,pause_remaining:0,speaker_id:1,media_epoch:1,members:members,
        me:{user_id:4,role:'guest',accepted:true,reserved:false,checked_in:true,removed:false,special_remaining:1,selection:[]},
        allowed_actions:['choose','hand','leave'],exchanges:[]};
      let data,code=200;
      if(options.url.endsWith('/live/v2/sessions')) data={items:[{id:1,title:state.title,scheduled_at:state.scheduled_at,status:'live',role:'guest'}],can_manage:true};
      else if(options.url.endsWith('/resources')) data={ready:false,missing:['LIVE_DEVICE_PILOT_VERIFIED'],provider:'tencent-trtc'};
      else if(options.url.endsWith('/results')) data={session_ended:true,items:[{id:1,session_id:1,peer_id:8,peer_name:'合成测试8',expires_at:now+7200,application_id:null,status:'available'}]};
      else if(options.url.endsWith('/credentials')) {code=503;data={detail:'界面测试不连接真实音视频'};}
      else if(options.url.endsWith('/commands')) {state.revision=2;state.me.selection=options.data.targets||[];data=state;}
      else if(options.url.includes('/live/v2/sessions/1')) data=state;
      else {code=503;data={detail:'界面测试没有配置此请求'};}
      // Automator resolves the returned value through the original wx callbacks.
      return {statusCode:code,data:data,header:{'content-type':'application/json'},cookies:[],errMsg:'request:ok'};
    });
    const lobby=await mp.navigateTo('/pagesSub/live/lobby');
    await lobby.waitFor(600);
    assert.match(await (await lobby.$('.live-title')).text(),/直播相亲/);
    assert.equal((await lobby.$$('.live-card')).length,1,JSON.stringify(await lobby.data()));
    if(capture) await mp.screenshot({path:path.join(out,'lobby.png')});
    console.log('PASS lobby');
    const detail=await mp.navigateTo('/pagesSub/live/detail?id=1');
    await detail.waitFor(500);
    assert.match(await (await detail.$('.live-title')).text(),/界面测试/);
    if(capture) await mp.screenshot({path:path.join(out,'detail.png')});
    console.log('PASS detail');
    const room=await mp.navigateTo('/pagesSub/live/room?id=1');
    await room.waitFor(700);
    const actions=await room.$('.live-round-controls');
    assert.ok(actions,'round controls render: '+JSON.stringify(await room.data()));
    const choices=await actions.$$('.live-choice');
    assert.equal(choices.length,4,'main guest sees four opposite-group candidates');
    const position=await choices[0].offset();
    await mp.pageScrollTo(Math.max(0,Number(position.top)-120));
    await choices[0].tap();
    await room.waitFor(async()=>(await actions.$$('.selected')).length===1);
    assert.equal((await actions.$$('.selected')).length,1,'first selection rendered');
    await (await actions.$$('.live-choice'))[1].tap();
    await room.waitFor(async()=>(await actions.$$('.selected')).length===2);
    assert.equal((await actions.$$('.selected')).length,2,'second selection rendered');
    console.log('PASS four-candidate selection');
    if(capture) await mp.screenshot({path:path.join(out,'room-selection.png')});
    const result=await mp.navigateTo('/pagesSub/live/results?id=1');
    await result.waitFor(500);
    assert.match(await (await result.$('.live-subtitle')).text(),/合成测试8/);
    if(capture) await mp.screenshot({path:path.join(out,'results.png')});
    console.log('PASS results');
    const manage=await mp.navigateTo('/pagesSub/live/manage');
    await manage.waitFor(500);
    assert.ok((await manage.$$('input')).length>=6,'staff roster inputs render');
    if(capture) await mp.screenshot({path:path.join(out,'manage.png')});
    const info=await mp.systemInfo();
    await fs.writeFile(path.join(out,'devtools-result.json'),JSON.stringify({passed:true,
      scope:'Actual WeChat simulator UI with synthetic request fixtures, not cloud or physical-device verification',
      windowWidth:info.windowWidth,windowHeight:info.windowHeight,SDKVersion:info.SDKVersion,pages:['lobby','detail','room','results','manage']},null,2));
    console.log('PASS WeChat live UI: lobby, detail, four-candidate selection, results, staff roster');
  } finally {
    await mp.restoreWxMethod('request');
    if(original) await mp.reLaunch('/'+original.path);
    await mp.disconnect();
  }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
