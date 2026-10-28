#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const repo = path.dirname(root);
const indexFile = path.join(root, 'catalog.json');
const relative = file => path.relative(root, file).split(path.sep).join('/');
const assert = (value, message) => { if (!value) throw new Error(message); };
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const inside = (base, target) => target === base || target.startsWith(base + path.sep);

async function filesIn(dir, name) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const found = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isSymbolicLink()) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await filesIn(file, name));
    else if (entry.name === name) found.push(file);
  }
  return found;
}

export async function loadCatalog() {
  const platformFiles = await filesIn(path.join(root, 'platforms'), 'platform.json');
  const platforms = new Map();
  for (const file of platformFiles) {
    const p = await read(file);
    assert(/^[a-z][a-z0-9-]*$/.test(p.id), `无效平台ID：${file}`);
    assert(!platforms.has(p.id), `重复平台ID：${p.id}`);
    assert(path.basename(path.dirname(file)) === p.id, `平台ID与目录不一致：${file}`);
    assert(p.name && p.surfaces && Object.keys(p.surfaces).length && p.environments, `平台契约缺失：${p.id}`);
    for (const [env, surfaces] of Object.entries(p.environments)) {
      for (const [surface, location] of Object.entries(surfaces)) {
        assert(p.surfaces[surface], `未知端：${p.id}/${env}/${surface}`);
        assert(['https:', 'http:'].includes(new URL(location.origin).protocol), `无效环境地址：${p.id}/${env}`);
        assert(typeof location.loginPath === 'string' && location.loginPath.startsWith('/'), `缺少登录路径：${p.id}/${env}/${surface}`);
      }
    }
    const references = [];
    for (const ref of p.references ?? []) {
      assert(ref.id && ref.title && ref.status && typeof ref.file === 'string' && !path.isAbsolute(ref.file), `平台资料引用无效：${p.id}`);
      assert(!references.some(r => r.id === ref.id), `平台资料ID重复：${p.id}/${ref.id}`);
      const resolved = await fs.realpath(path.resolve(path.dirname(file), ref.file));
      assert(inside(path.dirname(file), resolved), `平台资料越出目录：${p.id}/${ref.id}`);
      references.push({ ...ref, resolvedFile: relative(resolved) });
    }
    platforms.set(p.id, { ...p, references, manifest: relative(file) });
  }
  const manifests = [
    ...await filesIn(path.join(root, 'platforms'), 'capability.json'),
    ...await filesIn(path.join(root, 'shared'), 'capability.json'),
  ];
  const capabilities = new Map();
  for (const file of manifests) {
    const c = await read(file);
    assert(typeof c.id === 'string' && /^[a-z][a-z0-9.-]+$/.test(c.id), `无效能力ID：${file}`);
    assert(!capabilities.has(c.id), `重复能力ID：${c.id}`);
    assert(/^\d+\.\d+\.\d+$/.test(c.version), `缺少实现版本：${c.id}`);
    assert(['auth', 'navigation', 'component', 'flow'].includes(c.kind), `未知能力类型：${c.id}`);
    assert(c.title && c.module && c.inputs && Array.isArray(c.outputs) && c.outputs.length, `输入/输出契约缺失：${c.id}`);
    if (c.invocation) {
      assert(['read', 'form-fill', 'write'].includes(c.invocation.effect), `调用效果无效：${c.id}`);
      assert(Array.isArray(c.invocation.successStatuses) && c.invocation.successStatuses.length && c.invocation.successStatuses.every(s => c.outputs.includes(s)), `成功状态未在输出中声明：${c.id}`);
    }
    for (const key of ['preconditions', 'effects', 'dependencies', 'environments']) assert(Array.isArray(c[key]), `缺少${key}：${c.id}`);
    if (c.platform !== 'shared') {
      const p = platforms.get(c.platform);
      assert(p, `平台未登记：${c.id}`);
      assert(p.surfaces[c.surface] || c.surface === 'shared', `端未登记：${c.id}`);
      assert(c.id.startsWith(`${c.platform}.${c.surface}.`), `能力ID归属不一致：${c.id}`);
      const base = path.join(root, 'platforms', c.platform, c.surface, c.module);
      assert(inside(base, file), `能力目录归属不一致：${c.id}`);
      for (const env of c.environments) assert(p.environments[env] && (c.surface === 'shared' || p.environments[env][c.surface]), `环境未登记：${c.id}/${env}`);
    } else {
      assert(c.id.startsWith('shared.') && inside(path.join(root, 'shared'), file), `共享能力归属不一致：${c.id}`);
    }
    assert(c.entry && ['browser-function', 'node-function'].includes(c.entry.runtime), `运行位置缺失：${c.id}`);
    assert(typeof c.entry.adapter === 'string' && /^[A-Za-z_$][\w$]*$/.test(c.entry.functionName), `入口函数契约缺失：${c.id}`);
    assert(typeof c.entry.file === 'string' && !path.isAbsolute(c.entry.file), `入口需为相对路径：${c.id}`);
    const entry = await fs.realpath(path.resolve(path.dirname(file), c.entry.file));
    assert(inside(path.dirname(file), entry), `入口越出能力目录：${c.id}`);
    const syntax = spawnSync(process.execPath, ['--check', entry], { encoding: 'utf8' });
    assert(syntax.status === 0, `入口语法检查失败：${c.id}\n${syntax.stderr}`);
    const source = await fs.readFile(entry, 'utf8');
    assert(new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${c.entry.functionName}\\s*\\(`, 'm').test(source), `入口函数声明不存在：${c.id}/${c.entry.functionName}`);
    assert(c.verification && ['not-verified', 'verified', 'stale', 'blocked'].includes(c.verification.status), `验证状态缺失：${c.id}`);
    if (c.verification.status === 'verified') {
      assert(c.verification.date && c.verification.environment && c.verification.scope && c.verification.evidence, `验证范围/证据缺失：${c.id}`);
      assert(c.environments.includes(c.verification.environment), `验证环境超出支持范围：${c.id}`);
      const evidence = await fs.realpath(path.resolve(repo, c.verification.evidence));
      assert(inside(repo, evidence), `证据越出仓库：${c.id}`);
    }
    capabilities.set(c.id, { ...c, manifest: relative(file), entry: { ...c.entry, resolvedFile: relative(entry) } });
  }
  const visit = (id, stack = new Set(), seen = new Set(), order = []) => {
    assert(!stack.has(id), `循环依赖：${[...stack, id].join(' -> ')}`);
    if (seen.has(id)) return order;
    const c = capabilities.get(id);
    assert(c, `依赖不存在：${id}`);
    stack.add(id);
    for (const dependency of c.dependencies) {
      const target = capabilities.get(dependency.id);
      assert(target && target.version === dependency.version, `依赖不存在或版本不符：${id} -> ${dependency.id}@${dependency.version}`);
      visit(dependency.id, stack, seen, order);
    }
    stack.delete(id); seen.add(id); order.push(c);
    return order;
  };
  for (const id of capabilities.keys()) visit(id);
  return {
    document: { schemaVersion: 1, platforms: [...platforms.values()].sort((a,b)=>a.id.localeCompare(b.id)), capabilities: [...capabilities.values()].sort((a,b)=>a.id.localeCompare(b.id)) },
    capabilities, resolve: id => visit(id),
  };
}

async function main() {
try {
  const [command = 'list', ...args] = process.argv.slice(2);
  const catalog = await loadCatalog();
  const serialized = JSON.stringify(catalog.document, null, 2) + '\n';
  if (command === 'build') {
    assert(!args.length, 'build不接受额外参数');
    await fs.writeFile(indexFile, serialized);
    console.log(`已生成索引：${catalog.document.platforms.length}个平台，${catalog.capabilities.size}项能力`);
  } else if (command === 'check') {
    assert(!args.length, 'check不接受额外参数');
    assert(await fs.readFile(indexFile, 'utf8') === serialized, 'catalog.json已过期，请执行build');
    console.log(`校验通过：${catalog.capabilities.size}项能力；未执行登录或业务操作`);
  } else if (command === 'platform') {
    const platform = catalog.document.platforms.find(p => p.id === args[0]);
    assert(args.length === 1 && platform, '请提供一个已登记的平台ID');
    console.log(JSON.stringify(platform, null, 2));
  } else if (command === 'get' || command === 'resolve') {
    assert(args.length === 1 && catalog.capabilities.has(args[0]), '请提供一个已登记的能力ID');
    console.log(JSON.stringify(command === 'get' ? catalog.capabilities.get(args[0]) : catalog.resolve(args[0]), null, 2));
  } else if (command === 'list') {
    assert(args.length % 2 === 0, '筛选参数必须成对');
    const filters = {};
    for (let i=0;i<args.length;i+=2) { assert(['--platform','--surface','--kind'].includes(args[i]), `未知筛选参数：${args[i]}`); filters[args[i].slice(2)] = args[i+1]; }
    const items = [...catalog.capabilities.values()].filter(c=>Object.entries(filters).every(([k,v])=>c[k]===v));
    console.log(JSON.stringify(items.map(({id,version,title,kind,platform,surface,verification})=>({id,version,title,kind,platform,surface,verification})), null, 2));
  } else throw new Error('命令：build | check | list | platform <id> | get <id> | resolve <id>');
} catch (error) { console.error(error.message); process.exitCode = 1; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
