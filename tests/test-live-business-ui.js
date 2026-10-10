const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const vue = require('vue');
function component(file, exports, globals) {
  const script = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
    .split('<script setup lang="uts">')[1].split('</script>')[0]
    .replace(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]\s*$/gm, '');
  const code = babel.transformSync(script + '\nglobalThis.subject={' + exports + '}', {
    filename:'live-ui.ts', plugins:['@babel/plugin-transform-typescript'], configFile:false, babelrc:false
  }).code;
  const context = {...vue, ...globals};
  vm.runInNewContext(code, context);
  return context.subject;
}
async function main() {
  const { load } = require('./live-demo-loader.cjs')();
  const client = load('pagesSub/live/client.uts').createLiveClient(true);
  assert.equal((await client.list()).items[0].media_mode, 'disabled');
  assert.equal((await client.results(1)).media_mode, 'disabled');

  const routes = [];
  const notifications = component('pagesSub/community/notifications.uvue', 'open', {
    onMounted(){}, markNotificationRead:async()=>{},
    uni:{navigateTo:({url})=>routes.push(url), switchTab:({url})=>routes.push(url), showToast(){}}
  });
  await notifications.open({read:true,type:'live_invitation',targetType:'live_v2_session',targetId:7});
  await notifications.open({read:true,type:'live_result',targetType:'live_v2_session',targetId:8});
  assert.deepEqual(routes,['/pagesSub/live/detail?id=7','/pagesSub/live/results?id=8']);

  let account='account-1', modal, applied=0, unload;
  const results = component('pagesSub/live/results.uvue', 'apply', {
    createLiveClient:()=>({apply:async()=>{applied++}}),
    getCurrentAccountKey:()=>account,
    onLoad(){}, onShow(){}, onUnload:fn=>{unload=fn},
    uni:{showModal:options=>{modal=options}, showToast(){}}
  });
  const item={id:1,peer_name:'另一位嘉宾'};
  results.apply(item); account='account-2';
  await modal.success({confirm:true});
  assert.equal(applied,0,'old account confirmation must not send from a new login');
  results.apply(item); unload();
  await modal.success({confirm:true});
  assert.equal(applied,0,'closed results page must not submit a pending modal');

  let roomCommands=0,roomReports=0,hide;
  const room=component('pagesSub/live/room.uvue','state,id,leave,report',{
    createLiveClient:()=>({command:async()=>{roomCommands++},report:async()=>{roomReports++}}),
    getCurrentAccountKey:()=>account,liveCommand:(action,revision)=>({action,expected_revision:revision}),
    onLoad(){},onShow(){},onHide:fn=>{hide=fn},onUnload(){},clearInterval(){},
    uni:{showModal:options=>{modal=options},showToast(){},navigateBack(){}}
  });
  room.id.value=1;
  room.state.value={revision:2,me:{user_id:4},members:[{user_id:8,display_name:'另一位嘉宾'}]};
  room.leave();account='account-3';
  await modal.success({confirm:true});
  assert.equal(roomCommands,0,'old account leave modal must not act for a new login');
  room.report({detail:{value:0}});hide();
  await modal.success({confirm:true,content:'测试举报原因'});
  assert.equal(roomReports,0,'hidden room must not submit a stale report modal');
  console.log('PASS media labels, live notification routes and stale account/page confirmations');
}
main().catch(error=>{console.error(error);process.exitCode=1});
