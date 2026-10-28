import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {loadCatalog, root} from '../tools/catalog.mjs';
import {createRunner, validateRequest} from '../runtime/execute.mjs';
import {summarizeReceipt, uniqueSnapshotUid} from '../runtime/receipt.mjs';
import {consultationQueryPage} from '../platforms/salescloud/client/consultation/query-and-read-child/run.mjs';
import {toolAllowed} from '../runtime/mcp.mjs';
import {loginWithOneTransportRetry} from '../examples/greeproject-qa-client-bootstrap.mjs';

const catalog = await loadCatalog();
const id = 'salescloud.client.consultation.read-child-detail';
const inputs = Object.fromEntries(Object.keys(catalog.capabilities.get(id).inputs).map(k=>[k,'test-value']));

test('独立MCP入口遵守工具白名单、禁用项与宿主审批设置', () => {
  assert.equal(toolAllowed({enabled_tools:['fill']},'fill'),true);
  assert.equal(toolAllowed({enabled_tools:['fill']},'click'),false);
  assert.equal(toolAllowed({disabled_tools:['fill']},'fill'),false);
  assert.throws(()=>toolAllowed({tools:{fill:{approval_mode:'prompt'}}},'fill'),/宿主审批/);
});

test('会话准备只对已分类的暂态网络错误重试一次，不重试凭据拒绝', async () => {
  let count=0;
  const transient=Object.assign(new Error('fetch failed'),{cause:{code:'ECONNRESET'}});
  const value=await loginWithOneTransportRetry(async()=>{if(++count===1)throw transient;return 'session';},{},0);
  assert.equal(value,'session');assert.equal(count,2);
  count=0;await assert.rejects(loginWithOneTransportRetry(async()=>{count++;throw transient;},{},0));assert.equal(count,2);
  count=0;const rejected=Object.assign(new Error('credentials rejected'),{failureKind:'credentials_rejected',cause:{code:'ECONNRESET'}});
  await assert.rejects(loginWithOneTransportRetry(async()=>{count++;throw rejected;},{},0));assert.equal(count,1);
});

test('只读入口拒绝写能力、错误环境及未声明输入', () => {
  assert.throws(()=>validateRequest(catalog,{capability:'salescloud.client.consultation.approve-internal',environment:'qa',inputs}),/只读/);
  assert.throws(()=>validateRequest(catalog,{capability:id,environment:'uat',inputs}),/环境/);
  assert.throws(()=>validateRequest(catalog,{capability:id,environment:'qa',inputs:{...inputs,password:'dummy'}}),/未声明字段/);
  assert.throws(()=>validateRequest(catalog,{capability:id,environment:'qa',inputs,runId:'../overwrite'}),/runId/);
  const wrongAdapter={...catalog.capabilities.get(id),entry:{...catalog.capabilities.get(id).entry,adapter:'another-browser'}};
  assert.throws(()=>validateRequest({...catalog,capabilities:new Map([[id,wrongAdapter]]),resolve:()=>[wrongAdapter]},{capability:id,environment:'qa',inputs}),/适配器/);
});

test('定位零个或重复控件时停止，不选第一个', () => {
  const pattern=/textbox "咨询子单号"/;
  assert.equal(uniqueSnapshotUid('uid=2_1 textbox "咨询子单号"',pattern,'input'),'2_1');
  assert.throws(()=>uniqueSnapshotUid('uid=2_1 textbox "其他字段"',pattern,'input'),/0个/);
  assert.throws(()=>uniqueSnapshotUid('uid=2_1 textbox "咨询子单号"\nuid=2_2 textbox "咨询子单号"',pattern,'input'),/2个/);
  assert.throws(()=>uniqueSnapshotUid('uid=2_1 textbox "咨询子单号"\nuid=2_2 textbox "咨询子单号"',/textbox "咨询子单号"/g,'input'),/2个/);
});

test('头像字母紧邻账号不误拦截，近似账号仍被拒绝', async () => {
  const saved={document:globalThis.document,location:globalThis.location,getComputedStyle:globalThis.getComputedStyle};
  let label='CQRain03';
  const header={innerText:'CCQRain03',querySelectorAll:()=>['C',label].map(textContent=>({textContent,childElementCount:0,getClientRects:()=>[{}]}))};
  globalThis.document={querySelector:()=>header,querySelectorAll:()=>[]};
  globalThis.location={origin:'https://qasalescloud.gree.com',pathname:'/consult/consult-technology'};
  globalThis.getComputedStyle=()=>({visibility:'visible'});
  try {
    const args={action:'preflight',config:{account:'CQRain03'},origin:'https://qasalescloud.gree.com'};
    assert.equal((await consultationQueryPage(args)).checks.account,true);
    label='CQRain030';await assert.rejects(consultationQueryPage(args),/账号不符/);
  } finally {Object.assign(globalThis,saved);}
});

test('简洁回执不回显输入正文或任意额外字段', () => {
  const r=summarizeReceipt({runId:'r1',capability:id,version:'0.1.1',environment:'qa',target:'target',status:'passed',durationMs:10,receiptPath:'local',metrics:{toolCalls:1},result:{checks:{one:true,nested:{two:true}},longText:'do-not-echo',password:'dummy-secret'}});
  assert.deepEqual(r.checks,{passed:2,total:2});
  assert.ok(!JSON.stringify(r).includes('dummy-secret'));
  assert.ok(!JSON.stringify(r).includes('do-not-echo'));
});

test('回执落盘、同runId拒绝重跑、失败断言不报通过', async () => {
  const workspace=await fs.mkdtemp(path.join(os.tmpdir(),'ui-runner-test-'));
  let calls=0, bad=false;
  const runner=await createRunner({catalog,workspaceRoot:workspace,callTool:async()=>{
    calls++;return {content:[{type:'text',text:'```json\n'+JSON.stringify({status:'detail_verified',checks:{identity:!bad}})+'\n```'}]};
  }});
  try {
    const request={capability:id,environment:'qa',inputs,runId:'one'};
    const first=await runner.run(request,{pageId:2});
    assert.equal(first.summary.status,'passed');
    assert.equal(JSON.parse(await fs.readFile(first.summary.receipt,'utf8')).status,'passed');
    await assert.rejects(runner.run(request,{pageId:2}),/EEXIST/);
    assert.equal(calls,1);
    bad=true;
    const second=await runner.run({...request,runId:'two'},{pageId:2});
    assert.equal(second.summary.status,'blocked');
    assert.equal(second.summary.checks.passed,0);
  } finally {await fs.rm(workspace,{recursive:true,force:true});}
});

test('MCP错误留下失败阶段和调用次数，不自动重试', async () => {
  const workspace=await fs.mkdtemp(path.join(os.tmpdir(),'ui-runner-error-'));
  let calls=0;
  const runner=await createRunner({catalog,workspaceRoot:workspace,callTool:async()=>{calls++;throw Error('connection lost');}});
  try {
    const result=await runner.run({capability:id,environment:'qa',inputs,runId:'failure'},{pageId:2});
    assert.equal(result.summary.status,'blocked');assert.equal(calls,1);assert.equal(result.summary.toolCalls,1);
    const receipt=JSON.parse(await fs.readFile(result.summary.receipt,'utf8'));
    assert.equal(receipt.stage,id);
    assert.match(await fs.readFile(receipt.tracePath,'utf8'),/transport_error/);
  } finally {await fs.rm(workspace,{recursive:true,force:true});}
});

test('源码在目录加载后改变，拒绝沿用旧版本执行', async () => {
  const base=path.join(root,'node_modules','.cache');await fs.mkdir(base,{recursive:true});
  const dir=await fs.mkdtemp(path.join(base,'runner-source-'));
  const workspace=await fs.mkdtemp(path.join(os.tmpdir(),'ui-runner-drift-'));
  const file=path.join(dir,'fixture.js');await fs.writeFile(file,'function readFixture() {}');
  const c={...catalog.capabilities.get(id),entry:{runtime:'browser-function',adapter:'chrome-devtools',functionName:'readFixture',resolvedFile:path.relative(root,file)}};
  const fake={...catalog,capabilities:new Map([[id,c]]),resolve:()=>[c]};let calls=0;
  try {
    const runner=await createRunner({catalog:fake,workspaceRoot:workspace,callTool:async()=>{calls++;return {};}});
    await fs.writeFile(file,'function readFixture() { return 1; }');
    const result=await runner.run({capability:id,environment:'qa',inputs,runId:'drift'},{pageId:2});
    assert.equal(result.summary.status,'blocked');assert.match(result.summary.reason,/源码已变更/);assert.equal(calls,0);
  } finally {await fs.rm(dir,{recursive:true,force:true});await fs.rm(workspace,{recursive:true,force:true});}
});

test('失败截图无法取得时仍保留原失败步骤，不覆盖主错误', async () => {
  const workspace=await fs.mkdtemp(path.join(os.tmpdir(),'ui-runner-capture-'));
  const calls=[];
  const runner=await createRunner({catalog,workspaceRoot:workspace,callTool:async name=>{calls.push(name);return {isError:true,content:[{type:'text',text:name==='take_screenshot'?'capture failed':'query context failed'}]};}});
  try {
    const result=await runner.run({capability:id,environment:'qa',inputs,runId:'capture-error'},{pageId:2,capture:true});
    assert.equal(result.summary.status,'blocked');assert.equal(result.summary.stage,id);
    assert.match(result.summary.reason,/query context failed/);assert.match(result.receipt.evidenceError,/capture failed/);
    assert.deepEqual(calls,['evaluate_script','take_screenshot']);
  } finally {await fs.rm(workspace,{recursive:true,force:true});}
});
