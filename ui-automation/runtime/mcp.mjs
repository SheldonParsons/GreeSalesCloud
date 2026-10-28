import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {parse} from 'smol-toml';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

export function toolAllowed(settings, name) {
  if (settings.enabled_tools && !settings.enabled_tools.includes(name)) return false;
  if (settings.disabled_tools?.includes(name)) return false;
  const mode = settings.tools?.[name]?.approval_mode || settings.default_tools_approval_mode;
  if (mode && mode !== 'auto') throw new Error('此工具要求宿主审批，当前独立MCP入口未接入该审批流程');
  return true;
}

export async function connectConfiguredMcp({serverName = 'chrome-devtools-headless', configFile = path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'config.toml')} = {}) {
  let settings;
  try {settings = parse(await fs.readFile(configFile, 'utf8')).mcp_servers?.[serverName];}
  catch {throw new Error('无法读取或解析MCP配置，未输出配置内容');}
  if (!settings || settings.enabled === false || !settings.command || settings.url) throw new Error('需要已启用的STDIO MCP配置');
  if (settings.env_vars?.length || settings.experimental_environment) throw new Error('当前入口未接入远程/间接环境变量配置');
  const transport = new StdioClientTransport({command: settings.command, args: settings.args || [], cwd: settings.cwd,
    ...(settings.env ? {env: settings.env} : {}), stderr: 'pipe'});
  // 不把服务器启动日志或认证材料自动回传给模型。
  transport.stderr?.on('data', () => {});
  const client = new Client({name: 'greesalescloud-ui-runner', version: '0.1.0'}, {capabilities: {}});
  let available;
  try {
    await client.connect(transport, {timeout: (settings.startup_timeout_sec || 30) * 1000});
    available = new Set((await client.listTools()).tools.map(t => t.name));
  }
  catch { await transport.close().catch(() => {}); throw new Error('MCP连接失败；请核对服务和专用资料目录是否被占用'); }
  let closed = false;
  return {
    serverName,
    async callTool(name, args) {
      if (!toolAllowed(settings, name)) throw new Error(`MCP配置未开放工具：${name}`);
      if (!available.has(name)) throw new Error(`MCP未提供工具：${name}`);
      return client.callTool({name, arguments: args}, undefined, {timeout: (settings.tool_timeout_sec || 60) * 1000});
    },
    async close() {if (!closed) {closed = true;await client.close();}},
  };
}
