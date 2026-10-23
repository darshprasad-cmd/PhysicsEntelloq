import {it,expect,vi} from 'vitest';
import {readNotebook} from '../src/lib/storage';
import {DEFAULT_CONFIG} from '../src/types';
it('ignores malformed notebook models instead of crashing the workspace',()=>{
 const valid={id:'1',title:'Test',createdAt:new Date().toISOString(),config:DEFAULT_CONFIG,hypothesis:'h',conclusion:'c'};
 vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify([valid,{...valid,config:{kind:'unknown'}},{...valid,observation:{samples:'bad'}},null])});
 expect(readNotebook()).toEqual([valid]);vi.unstubAllGlobals();
});
it('survives corrupt or unavailable browser storage',()=>{vi.stubGlobal('localStorage',{getItem:()=>'{'});expect(readNotebook()).toEqual([]);vi.stubGlobal('localStorage',{getItem:()=>{throw new Error('denied')}});expect(readNotebook()).toEqual([]);vi.unstubAllGlobals();});
