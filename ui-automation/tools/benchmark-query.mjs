#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {getEncoding} from 'js-tiktoken';
import {loadCatalog,root,repo} from './catalog.mjs';
import {createRunner,validateRequest} from '../runtime/execute.mjs';
import {connectConfiguredMcp} from '../runtime/mcp.mjs';
import {mcpJson,mcpText,uniqueSnapshotUid} from '../runtime/receipt.mjs';
import {consultationQueryPage} from '../platforms/salescloud/client/consultation/query-and-read-child/run.mjs';

const flags={};const argv=process.argv.slice(2);
for(let i=0;i<argv.length;i++){
  if(argv[i]==='--development')flags.development=true;
  else if(['--request','--bootstrap','--mcp-server'].includes(argv[i])&&argv[i+1])flags[argv[i].slice(2)]=argv[++i];
  else throw Error('参数：--request JSON --bootstrap 模块 [--mcp-server 名称] [--development]');
}
if(!flags.request||!flags.bootstrap)throw Error('缺少请求或bootstrap');
const request=JSON.parse(await fs.readFile(path.resolve(flags.request),'utf8'));
const id='salescloud.client.consultation.query-and-read-child';
if(request.capability!==id)throw Error('此对照只支持咨询查询查看能力');
const catalog=await loadCatalog();
validateRequest(catalog,request,flags.development?[id]:[]);
const caseId=randomUUID();const output=path.join(repo,'.local','ui-entry-benchmarks',caseId);
await fs.mkdir(output,{recursive:true,mode:0o700});
const adapter=await connectConfiguredMcp({serverName:flags['mcp-server']});
let session;const samples=[];let activeTrace=[];
const call=async(name,args)=>{
  const start=performance.now();const result=await adapter.callTool(name,args);
  activeTrace.push({name,args,response:result,durationMs:performance.now()-start});
  return result;
};
const checkedCall=async(name,args)=>{const r=await call(name,args);if(r.isError)throw Error(mcpText(r).slice(0,400));return r;};
const evaluate=async(fn,input)=>mcpJson(await checkedCall('evaluate_script',{pageId:session.pageId,function:`async () => await (${fn.toString()})(${JSON.stringify(input)})`,waitForStableDom:false}));
const origin=catalog.document.platforms.find(p=>p.id==='salescloud').environments[request.environment].client.origin;
const read=catalog.capabilities.get('salescloud.client.consultation.read-child-detail');
const readSource=await fs.readFile(path.resolve(root,read.entry.resolvedFile),'utf8');
async function baseline(){
  await evaluate(consultationQueryPage,{action:'preflight',config:request.inputs,origin});
  let snap=mcpText(await checkedCall('take_snapshot',{pageId:session.pageId}));
  const reset=uniqueSnapshotUid(snap,/button "重\s*置"/,'重置');
  await checkedCall('click',{pageId:session.pageId,uid:reset});
  const prepared=await evaluate(consultationQueryPage,{action:'wait-reset',config:request.inputs,origin});
  snap=mcpText(await checkedCall('take_snapshot',{pageId:session.pageId}));
  const input=uniqueSnapshotUid(snap,/textbox "咨询子单号"/,'子单输入');
  const query=uniqueSnapshotUid(snap,/button "查\s*询"/,'查询');
  await checkedCall('fill',{pageId:session.pageId,uid:input,value:request.inputs.childNumber});
  await checkedCall('click',{pageId:session.pageId,uid:query});
  const queried=await evaluate(consultationQueryPage,{action:'wait-query',config:request.inputs,origin});
  const detail=mcpJson(await checkedCall('evaluate_script',{pageId:session.pageId,function:`async () => {${readSource}\nreturn await ${read.entry.functionName}(${JSON.stringify(request.inputs)});}`,waitForStableDom:false}));
  if(detail.status!=='detail_verified')throw Error('基线详情未核验：'+detail.reason);
  return {status:'query_detail_verified',checks:{prepare:prepared.checks,query:queried.checks,detail:detail.checks},businessStatus:detail.businessStatus};
}
try{
  const bootstrap=await import(pathToFileURL(path.resolve(flags.bootstrap)).href);
  session=await bootstrap.bootstrap({adapter,request,capability:catalog.capabilities.get(id)});
  const runner=await createRunner({catalog,callTool:call,developmentIds:flags.development?[id]:[]});
  const order=[['baseline',0],['optimized',0],['baseline',1],['optimized',1],['optimized',2],['baseline',2],['baseline',3],['optimized',3]];
  for(const [mode,round] of order){
    // 相同起点：共同关闭上一轮只读详情，排除清理和认证开销。
    const cleanup=await adapter.callTool('evaluate_script',{pageId:session.pageId,function:`async () => await (${consultationQueryPage.toString()})(${JSON.stringify({action:'close-only',config:request.inputs,origin})})`,waitForStableDom:false});
    if(cleanup.isError)throw Error('对照起点清理失败：'+mcpText(cleanup).slice(0,200));
    activeTrace=[];const start=performance.now();let result,summary,receipt;
    if(mode==='baseline')result=await baseline();
    else {
      const execution=await runner.run({...request,runId:`bench-${caseId}-${mode}-${round}`},{pageId:session.pageId});
      if(execution.receipt.status!=='passed')throw Error('优化流程未完成：'+execution.summary.reason);
      result=execution.receipt.result;summary=execution.summary;receipt=execution.receipt;
    }
    const durationMs=Math.round((performance.now()-start)*100)/100;
    const file=path.join(output,`${mode}-${round}.json`);
    await fs.writeFile(file,JSON.stringify({mode,round,durationMs,result,summary,receipt,trace:activeTrace},null,2)+'\n',{mode:0o600});
    samples.push({mode,round,warmup:round===0,durationMs,toolCalls:activeTrace.length,result,file,summary});
    console.log(JSON.stringify({mode,round,durationMs,toolCalls:activeTrace.length,assertionsPassed:true}));
  }
  const canonical=JSON.stringify(samples[0].result);
  if(!samples.every(s=>JSON.stringify(s.result)===canonical))throw Error('前后断言结果不一致');
  await adapter.callTool('take_screenshot',{pageId:session.pageId,filePath:path.join(output,'optimized-detail.png'),format:'png'});
  await session.cleanup();session=null;await adapter.close();
  // 离线计数工具输出的文本；不是Codex实际usage或计费用量。
  const enc=getEncoding('o200k_base');
  for(const sample of samples){
    const record=JSON.parse(await fs.readFile(sample.file,'utf8'));
    const outputs=sample.mode==='baseline'?record.trace.map(t=>JSON.stringify(t.response)):[JSON.stringify(record.summary)];
    sample.modelVisibleOutputChars=outputs.reduce((n,s)=>n+s.length,0);
    sample.estimatedOutputTokens=outputs.reduce((n,s)=>n+enc.encode(s).length,0);
    sample.internalResponseChars=record.trace.reduce((n,t)=>n+JSON.stringify(t.response).length,0);
    sample.outerDispatches=sample.mode==='baseline'?sample.toolCalls:1;
    delete sample.result;
  }
  const report={date:new Date().toISOString(),caseId,capability:id,environment:request.environment,samples,
    resultParity:true,tokenizer:'js-tiktoken/o200k_base',actualModelUsageAvailable:false,
    interpretation:'有界计时与工具文本投影对照，未调用两组独立模型。基线按逐步MCP回执进入模型，优化按一次统一入口简洁回执计；不含系统提示、历史上下文、工具定义、思考、图像或缓存计费。认证、建页、共同清理、截图和离线分词不计入流程耗时。',
    traceDirectory:output};
  await fs.writeFile(path.join(output,'comparison.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({completed:true,comparison:path.join(output,'comparison.json')}));
}catch(error){
  let diagnostic;
  if(session) diagnostic=await adapter.callTool('evaluate_script',{pageId:session.pageId,function:"() => {const h=document.querySelector('header,[role=banner]');return {path:location.pathname,headerText:h?.innerText,headerLeaves:h?[...h.querySelectorAll('*')].filter(e=>e.childElementCount===0&&e.getClientRects().length).map(e=>e.textContent.trim()).filter(Boolean):[]};}",waitForStableDom:false}).catch(()=>null);
  await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({error:String(error.message),trace:activeTrace,diagnostic},null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({status:'blocked',reason:String(error.message).slice(0,400),diagnostic:path.join(output,'failure.json')}));
  process.exitCode=2;
}finally{
  try{await session?.cleanup?.();}finally{await adapter.close();}
}
