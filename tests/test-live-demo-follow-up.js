const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const vue = require('vue');
const {load} = require('./live-demo-loader.cjs')();
const demo = load('pagesSub/live/demo.uts');
const source = fs.readFileSync(path.join(__dirname,'../pagesSub/live/LiveDemoFollowUp.uvue'),'utf8')
  .split('<script setup lang="uts">')[1].split('</script>')[0].replace(/^import.*$/gm,'');
const code = babel.transformSync(source+'\nglobalThis.form={tab,greeting,draft,showApplications,chatId,applying,refresh};',
  {filename:'live-follow-up.ts',plugins:['@babel/plugin-transform-typescript'],configFile:false,babelrc:false}).code;
const context = {...vue,...demo,onMounted:()=>{},onUnmounted:()=>{}};
vm.runInNewContext(code,context);
const f=context.form;
f.tab.value=1; f.greeting.value='上一角色的介绍'; f.draft.value='上一角色的消息';
f.showApplications.value=true; f.applying.value={id:1};
demo.demoSwitchActor(8); f.refresh();
assert.equal(f.tab.value,0,'new recipient must open received applications, not the previous sender tab');
assert.equal(f.greeting.value,'');
assert.equal(f.draft.value,'');
assert.equal(f.applying.value,null);
assert.equal(f.showApplications.value,false);
assert.equal(f.chatId.value,0);
console.log('PASS live follow-up role switch: received tab, private drafts and sheets reset');
