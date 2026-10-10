// Exercise actual UTS component logic with Vue reactivity, not copied rules.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const babel=require('@babel/core');
const vue=require('vue');
const state=vue.reactive({round_index:0,phase:'choice',status:'live',main_id:4,revision:1,
  me:{user_id:4,role:'guest',selection:[]},exchanges:[],
  allowed_actions:['choose'], allowed_targets:{choice_ids:[8,9,10,11],interest_ids:[],stage_ids:[],speaker_ids:[],remove_ids:[]},
  members:[4,8,9,10,11].map(id=>({user_id:id,group:id===4?'male':'female',role:'guest',attendance:'onstage'}))});
const props=vue.reactive({state,busy:false,expired:false});
const source=fs.readFileSync(path.join(__dirname,'../pagesSub/live/LiveRoundActions.uvue'),'utf8')
  .split('<script setup lang="uts">')[1].split('</script>')[0].replace(/^import.*$/gm,'');
const code=babel.transformSync(source+'\nglobalThis.controls={selected,toggle,targets};',
  {filename:'live-controls.ts',plugins:['@babel/plugin-transform-typescript'],configFile:false,babelrc:false}).code;
const context={...vue,defineProps:()=>props,defineEmits:()=>()=>{},uni:{showToast(){}},liveCommand:()=>({})};
vm.runInNewContext(code,context);
async function main(){
  const {selected,toggle}=context.controls;
  for(const id of [8,9,10])toggle(id);
  assert.deepEqual(Array.from(selected.value),[8,9,10]);
  state.members.find(m=>m.user_id===8).attendance='left';
  state.allowed_targets.choice_ids=[9,10,11];
  await vue.nextTick();
  assert.deepEqual(Array.from(selected.value),[9,10],'withdrawn candidate must not occupy invisible selection slot');
  toggle(11);
  assert.deepEqual(Array.from(selected.value),[9,10,11]);
  props.expired=true;toggle(9);
  assert.equal(selected.value.length,3,'expired window is not locally editable');
  state.members.push({user_id:5,group:'male',role:'guest',attendance:'onstage'});
  state.main_id=5; state.me.user_id=5; state.me.selection=[];
  await vue.nextTick();
  assert.equal(selected.value.length,0,'actor switch must clear the previous private draft');
  console.log('PASS live controls: candidate exit, remaining private draft, capacity and deadline');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
