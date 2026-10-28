import {test} from 'node:test';
import assert from 'node:assert/strict';
import {displayPixelRatio,modestDevice} from '../resolution.mjs';
test('HD rendering uses native 1x / 2x pixels, without excessive supersampling',()=>{
  assert.equal(displayPixelRatio(900,500,1),1);
  assert.equal(displayPixelRatio(900,500,2),2);
  assert.equal(displayPixelRatio(900,500,3),2);
  assert.equal(displayPixelRatio(900,500,2,true),1.5);
});
test('4K, ultra-wide and low-memory rendering stay inside the framebuffer budget',()=>{
  for(const [w,h] of [[900,500],[3840,2160],[7680,4320],[3440,1440]])for(const low of [false,true]){
    const ratio=displayPixelRatio(w,h,3,low);
    assert.ok(w*h*ratio*ratio<=(low?2000000:4000000)+.001);
  }
});
test('Unknown device capabilities use bounded defaults; modest devices reduce detail',()=>{
  assert.equal(modestDevice({}),false);
  assert.equal(modestDevice({deviceMemory:4}),true);
  assert.equal(modestDevice({hardwareConcurrency:2}),true);
  assert.equal(modestDevice({deviceMemory:8,hardwareConcurrency:8}),false);
  assert.equal(displayPixelRatio(0,0,NaN),1);
});
