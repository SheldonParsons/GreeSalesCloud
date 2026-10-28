#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadCatalog} from './catalog.mjs';
import {createRunner, validateRequest} from '../runtime/execute.mjs';
import {connectConfiguredMcp} from '../runtime/mcp.mjs';

const help = 'node ui-automation/tools/run.mjs --request <JSON文件> --bootstrap <本机会话准备模块> [--mcp-server chrome-devtools-headless] [--capture] [--full] [--validate-only]';
let adapter, session, stage = 'request-validation';
try {
  const argv = process.argv.slice(2), flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (['--capture','--full','--validate-only','--help'].includes(argv[i])) flags[argv[i]] = true;
    else if (['--request','--bootstrap','--mcp-server','--config'].includes(argv[i]) && argv[i+1]) flags[argv[i]] = argv[++i];
    else throw new Error(help);
  }
  if (flags['--help']) { console.log(help); process.exit(0); }
  if (!flags['--request']) throw new Error(help);
  const input = JSON.parse(await fs.readFile(path.resolve(flags['--request']), 'utf8'));
  const requests = Array.isArray(input) ? input : [input];
  if (!requests.length) throw new Error('请求列表为空');
  const catalog = await loadCatalog();
  const capabilities = requests.map(r => validateRequest(catalog, r));
  const contexts = new Set(requests.map((r,i) => `${r.environment}/${capabilities[i].platform}/${capabilities[i].surface}/${r.inputs.account}`));
  if (contexts.size !== 1) throw new Error('一个批次只复用同环境、平台、端和账号；不同身份分开执行');
  if (flags['--validate-only']) {
    console.log(JSON.stringify({status:'validated_only', requests:requests.map((r,i)=>({capability:r.capability,version:capabilities[i].version,environment:r.environment})), businessExecuted:false}));
  } else {
    if (!flags['--bootstrap']) throw new Error('缺少本机bootstrap模块；本入口不自动查找凭据或猜测页面');
    stage = 'mcp-connection';
    adapter = await connectConfiguredMcp({serverName:flags['--mcp-server'],configFile:flags['--config']});
    stage = 'session-bootstrap';
    const bootstrap = await import(pathToFileURL(path.resolve(flags['--bootstrap'])).href);
    session = await bootstrap.bootstrap({adapter, request:requests[0], capability:capabilities[0]});
    if (!session || !Number.isSafeInteger(session.pageId)) throw new Error('会话准备没有返回当前pageId');
    const runner = await createRunner({catalog,callTool:adapter.callTool});
    stage = 'capability-execution';
    for (const request of requests) {
      const result = await runner.run(request,{pageId:session.pageId,capture:!!flags['--capture']});
      console.log(JSON.stringify(flags['--full'] ? result.receipt : result.summary));
      if (result.receipt.status !== 'passed') {process.exitCode=2;break;}
    }
  }
} catch (error) {
  console.log(JSON.stringify({status:'blocked',stage,reason:String(error.message).slice(0,400)}));
  process.exitCode=2;
} finally {
  try {await session?.cleanup?.();}
  catch {console.log(JSON.stringify({status:'blocked',stage:'cleanup',reason:'本机会话清理未完成，保留运行回执核对'}));process.exitCode=2;}
  finally {await adapter?.close().catch(()=>{process.exitCode=2;});}
}
