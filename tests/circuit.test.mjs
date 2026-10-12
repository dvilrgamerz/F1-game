import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { CatmullRomCurve3, Vector3 } from 'three';

const src=readFileSync(new URL('../src/v3/track/ardenneGP.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {ARDENNE_GP}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
test('track is a closed Grand Prix circuit with valid sectors and DRS zones',()=>{
  assert.equal(ARDENNE_GP.laps,44);
  assert.ok(ARDENNE_GP.controlPoints.length>=20);
  assert.ok(ARDENNE_GP.widthMeters>=12 && ARDENNE_GP.widthMeters<=20);
  assert.ok(ARDENNE_GP.drsZones.every(z=>z.activationStart<z.activationEnd));
});
test('the rendered Ardenne GP circuit has its declared 7 km physical length',()=>{
  const raw=ARDENNE_GP.controlPoints.map(p=>new Vector3(p.x,p.y,p.z));
  const initialCurve=new CatmullRomCurve3(raw,true,'centripetal',0.45);
  const initialScale=ARDENNE_GP.lengthMeters/initialCurve.getLength();
  const scalePts=r=>raw.map(p=>new Vector3(p.x*r,p.y,p.z*r));
  const firstPass=new CatmullRomCurve3(scalePts(initialScale),true,'centripetal',0.45);
  const finalScale=initialScale*ARDENNE_GP.lengthMeters/firstPass.getLength();
  const result=new CatmullRomCurve3(scalePts(finalScale),true,'centripetal',0.45);
  assert.ok(Math.abs(result.getLength()-ARDENNE_GP.lengthMeters)<ARDENNE_GP.lengthMeters*0.02);
});
test('runtime includes corrected left/right steering and wheel orientation',()=>{
  const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
  assert.match(main,/const keySteer = \(keys\.has\('KeyD'\)/);
  assert.match(main,/player\.heading \+ Math\.PI/);
  assert.match(main,/ai\.car\.rotation\.y = Math\.atan2\(tangent\.x, tangent\.z\) \+ Math\.PI/);
  assert.match(main,/TRACK_LENGTH_METERS/);
  assert.match(main,/readGamepad\(\)/);
  assert.doesNotMatch(main,/player\.heading \+= diff \* dt/);
});
