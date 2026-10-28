import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash, randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {loadCatalog, root as catalogRoot, repo as repoRoot} from '../tools/catalog.mjs';
import {mcpJson, mcpText, summarizeReceipt} from './receipt.mjs';

const inside = (base, file) => file === base || file.startsWith(base + path.sep);
const hash = text => createHash('sha256').update(text).digest('hex');

export function validateRequest(catalog, request, developmentIds = []) {
  const capability = catalog.capabilities.get(request?.capability);
  if (!capability) throw new Error('能力未登记');
  for (const c of catalog.resolve(capability.id)) {
    if (c.invocation?.effect !== 'read') throw new Error(`当前入口只支持已声明的只读能力：${c.id}`);
    if (c.entry.adapter !== 'chrome-devtools') throw new Error(`当前入口不支持适配器：${c.entry.adapter}`);
    if (!c.environments.includes(request.environment)) throw new Error(`能力不支持环境：${request.environment}`);
    if (c.verification.status !== 'verified' && !developmentIds.includes(c.id)) throw new Error(`能力尚未验证或已失效：${c.id}`);
  }
  if (!request.inputs || typeof request.inputs !== 'object' || Array.isArray(request.inputs)) throw new Error('inputs必须是对象');
  const names = Object.keys(capability.inputs);
  if (Object.keys(request.inputs).some(name => !names.includes(name))) throw new Error('输入含未声明字段');
  // 当前接入的两项只读能力均要求非空字符串，其他输入类型需另扩展契约。
  for (const name of names) if (typeof request.inputs[name] !== 'string' || !request.inputs[name].trim()) throw new Error(`缺少字符串输入：${name}`);
  if (request.runId && !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(request.runId)) throw new Error('无效runId');
  return capability;
}

export async function createRunner({catalog, callTool, workspaceRoot = repoRoot, developmentIds = []}) {
  catalog ||= await loadCatalog();
  workspaceRoot = await fs.realpath(workspaceRoot);
  const realCatalogRoot = await fs.realpath(catalogRoot);
  if (typeof callTool !== 'function') throw new Error('缺少MCP调用连接');
  const sources = new Map();
  for (const c of catalog.capabilities.values()) {
    const file = await fs.realpath(path.resolve(catalogRoot, c.entry.resolvedFile));
    if (!inside(realCatalogRoot, file)) throw new Error('能力入口越出目录');
    const manifest = await fs.realpath(path.resolve(catalogRoot, c.manifest));
    if (!inside(realCatalogRoot, manifest)) throw new Error('能力契约越出目录');
    sources.set(c.id, {file, manifest, sha256: hash(await fs.readFile(file, 'utf8')), manifestSha256: hash(await fs.readFile(manifest, 'utf8'))});
  }

  return {
    catalog,
    async run(request, {pageId, capture = false} = {}) {
      const capability = validateRequest(catalog, request, developmentIds);
      if (!Number.isSafeInteger(pageId) || pageId < 0) throw new Error('缺少当前连接核对过的pageId');
      const runId = request.runId || randomUUID();
      const local = path.join(workspaceRoot, '.local');
      await fs.mkdir(local, {recursive: true, mode: 0o700});
      if (await fs.realpath(local) !== path.resolve(local)) throw new Error('拒绝通过符号链接保存回执');
      const runs = path.join(local, 'ui-runs');
      await fs.mkdir(runs, {recursive: true, mode: 0o700});
      if (await fs.realpath(runs) !== path.resolve(runs)) throw new Error('运行目录必须位于本机.local中');
      const dir = path.join(runs, runId);
      // 同一个runId禁止覆盖或静默重跑，失败记录也保留。
      await fs.mkdir(dir, {mode: 0o700});
      const receiptPath = path.join(dir, 'receipt.json');
      const tracePath = path.join(dir, 'mcp.jsonl');
      const receipt = {schemaVersion: 1, runId, capability: capability.id, version: capability.version,
        environment: request.environment, status: 'running', stage: 'preflight', startedAt: new Date().toISOString(),
        target: request.inputs.childNumber, inputSha256: hash(JSON.stringify(request.inputs)),
        receiptPath, tracePath, contracts: [], metrics: {toolCalls: 0, toolMs: 0, requestChars: 0, responseChars: 0}};
      const start = performance.now();
      const persist = async () => {
        const temp = receiptPath + '.tmp';
        await fs.writeFile(temp, JSON.stringify(receipt, null, 2) + '\n', {mode: 0o600});
        await fs.rename(temp, receiptPath);
      };
      await persist();
      const tool = async (name, args, stage) => {
        if (!['evaluate_script', 'take_snapshot', 'fill', 'fill_form', 'click', 'take_screenshot'].includes(name)) throw new Error(`未开放工具：${name}`);
        if (args.pageId !== undefined && args.pageId !== pageId) throw new Error('拒绝操作其他页面');
        receipt.stage = stage;
        await persist();
        const params = {...args, pageId};
        const begun = performance.now();
        receipt.metrics.toolCalls++;
        receipt.metrics.requestChars += JSON.stringify({name, arguments: params}).length;
        let response;
        try { response = await callTool(name, params); }
        catch (error) {
          const durationMs = performance.now() - begun;
          receipt.metrics.toolMs += durationMs;
          await fs.appendFile(tracePath, JSON.stringify({stage, name, durationMs, error:'transport_error'})+'\n', {mode:0o600});
          throw new Error(`MCP调用失败：${name}: ${String(error.message).slice(0, 300)}`);
        }
        const durationMs = performance.now() - begun;
        receipt.metrics.toolMs += durationMs;
        receipt.metrics.responseChars += JSON.stringify(response).length;
        await fs.appendFile(tracePath, JSON.stringify({stage, name, args: params, durationMs, response}) + '\n', {mode: 0o600});
        await persist();
        if (response.isError) throw new Error(mcpText(response).slice(0, 500));
        return response;
      };
      const evaluate = async (fn, input, stage) => mcpJson(await tool('evaluate_script', {
        function: `async () => await (${fn.toString()})(${JSON.stringify(input)})`, waitForStableDom: false,
      }, stage));
      const saveScreenshot = async () => {
        receipt.screenshotAttempted = true;
        const file = path.join(dir, 'checkpoint.png');
        await tool('take_screenshot', {filePath: file, format: 'png'}, 'evidence-screenshot');
        const stat = await fs.stat(file);
        if (!stat.isFile() || !stat.size) throw new Error('截图未实际落盘');
        receipt.screenshot = file;
        receipt.screenshotBytes = stat.size;
      };
      const invoke = async (c, inputs) => {
        const source = sources.get(c.id);
        const text = await fs.readFile(source.file, 'utf8');
        if (hash(text) !== source.sha256) throw new Error(`能力源码已变更，请重新加载目录：${c.id}`);
        if (hash(await fs.readFile(source.manifest,'utf8')) !== source.manifestSha256) throw new Error(`能力契约已变更，请重新加载目录：${c.id}`);
        if (!receipt.contracts.some(v => v.id === c.id)) receipt.contracts.push({id: c.id, version: c.version, sha256: source.sha256, manifestSha256:source.manifestSha256});
        if (c.entry.runtime === 'browser-function') {
          return mcpJson(await tool('evaluate_script', {
            function: `async () => { ${text}\n return await ${c.entry.functionName}(${JSON.stringify(inputs)}); }`, waitForStableDom: false,
          }, c.id));
        }
        const module = await import(pathToFileURL(source.file).href + '?sha256=' + source.sha256);
        const platform = catalog.document.platforms.find(p => p.id === c.platform);
        const origin = platform?.environments[request.environment]?.[c.surface]?.origin;
        if (!origin) throw new Error('缺少平台环境入口');
        return module[c.entry.functionName](inputs, {origin, pageId, tool, evaluate,
          runDependency: async (id, input) => {
            const declared = c.dependencies.find(d => d.id === id);
            const dependency = catalog.capabilities.get(id);
            if (!declared || !dependency || declared.version !== dependency.version) throw new Error('调用了未声明或版本不符的依赖');
            return invoke(dependency, input);
          }});
      };
      try {
        receipt.result = await invoke(capability, request.inputs);
        if (!capability.outputs.includes(receipt.result?.status)) throw new Error('能力返回未声明状态');
        receipt.status = capability.invocation.successStatuses.includes(receipt.result.status) ? 'passed' : 'blocked';
        const flags = [];
        const collect = v => {if (typeof v === 'boolean') flags.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(collect);};
        collect(receipt.result.checks);
        if (receipt.status === 'passed' && (!flags.length || flags.some(v => !v))) throw new Error('成功结果缺少通过的断言或包含失败断言');
        if (receipt.status !== 'passed') receipt.reason = receipt.result.reason || '能力未完成核验';
        if (capture) await saveScreenshot();
      } catch (error) {
        const failedStage = receipt.stage;
        receipt.status = 'blocked';
        receipt.reason = String(error.message).slice(0, 500);
        if (capture && !receipt.screenshotAttempted) {
          try {await saveScreenshot();}
          catch (captureError) {receipt.evidenceError = String(captureError.message).slice(0, 200);}
        }
        receipt.stage = failedStage;
      } finally {
        receipt.durationMs = Math.round(performance.now() - start);
        receipt.metrics.toolMs = Math.round(receipt.metrics.toolMs);
        receipt.finishedAt = new Date().toISOString();
        await persist();
      }
      return {receipt, summary: summarizeReceipt(receipt)};
    },
  };
}
