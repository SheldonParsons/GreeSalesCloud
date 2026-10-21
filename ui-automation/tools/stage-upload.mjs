#!/usr/bin/env node
// 将本仓库内已获授权的非敏感测试附件暂存至Chrome DevTools明确支持的系统临时目录。
// 不修改MCP权限配置，也不执行上传。调用方仍需核对环境、账号、目标控件和业务授权。
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const repo = await fs.realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const [input, ...extra] = process.argv.slice(2);
if (!input || extra.length) {
  console.error('用法：node ui-automation/tools/stage-upload.mjs <本仓库内的测试附件>');
  process.exit(1);
}
let directory;
try {
  const source = await fs.realpath(path.resolve(input));
  if (!source.startsWith(repo + path.sep)) throw new Error('测试附件必须位于本仓库内');
  if (/(^|[\/])\.secrets([\/]|$)|(^|[\/])\.env(?:\.|$)|accounts\..*\.ya?ml$/i.test(source)) throw new Error('不得暂存凭据文件');
  const stat = await fs.stat(source);
  if (!stat.isFile()) throw new Error('输入必须是普通文件');
  const bytes = await fs.readFile(source);
  const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ui-upload-'));
  await fs.chmod(directory, 0o700);
  const target = path.join(directory, path.basename(source));
  await fs.copyFile(source, target, constants.COPYFILE_EXCL);
  await fs.chmod(target, 0o600);
  if (sha256(bytes) !== sha256(await fs.readFile(target))) throw new Error('暂存文件摘要不一致');
  console.log(JSON.stringify({path: target, bytes: bytes.length, sha256: sha256(bytes)}));
} catch (error) {
  if (directory) await fs.rm(directory, {recursive: true, force: true});
  console.error(error.message);
  process.exitCode = 1;
}
