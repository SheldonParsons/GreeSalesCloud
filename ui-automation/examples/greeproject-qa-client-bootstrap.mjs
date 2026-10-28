/** 本机QA客户端认证准备示例：复用外部GreeProject认证包，非SSO测试或通用auth能力。 */
import fs from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {repo} from '../tools/catalog.mjs';
import {mcpJson,mcpText} from '../runtime/receipt.mjs';

export function isTransientAuthTransport(error) {
  if (error?.failureKind && error.failureKind !== 'transport_transient') return false;
  return error?.failureKind === 'transport_transient' || ['ECONNRESET','ETIMEDOUT','EAI_AGAIN','UND_ERR_CONNECT_TIMEOUT','UND_ERR_SOCKET'].includes(error?.cause?.code);
}

export async function loginWithOneTransportRetry(login, options, delayMs = 200) {
  try {return await login('commercial_client', options);}
  catch (error) {
    if (!isTransientAuthTransport(error)) throw error;
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return login('commercial_client', options);
  }
}

export async function bootstrap({adapter,request,capability}) {
  if(adapter.serverName!=='chrome-devtools-headless'||request.environment!=='qa'||request.inputs.account!=='CQRain03'||capability.platform!=='salescloud'||capability.surface!=='client')throw Error('本机验证bootstrap仅允许指定QA客户端账号与无界面连接');
  const root=path.resolve(process.env.GREEPROJECT_ROOT || path.join(repo,'..','GreeProject'));
  const expected='ac0e342446274d465f90acf9c49c27d67da9fc2ba7726f067d5f52fd642e7eff';
  const source=await fs.readFile(root+'/packages/qa-auth/src/login.ts');
  if(createHash('sha256').update(source).digest('hex')!==expected)throw Error('外部认证源码变化，停止复用');
  const owner='ui-entry-'+randomUUID();
  const opened=await adapter.callTool('new_page',{url:'https://qasalescloud.gree.com/login',background:true,isolatedContext:owner});
  const line=mcpText(opened).split('\n').find(s=>s.includes('isolatedContext='+owner));
  const pageId=Number(line?.match(/^(\d+):/)?.[1]);
  if(!pageId)throw Error('无法识别本次页面');
  const cleanup=async()=>{
    const r=await adapter.callTool('evaluate_script',{pageId,function:`() => {if(sessionStorage.getItem('ui-runner-owner')!==${JSON.stringify(owner)})throw Error('页面所有权不符');for(const key of ['shopping-device-key','shopping-token','shopping-user','shopping:timeout-logout:lastActivityAt'])localStorage.removeItem(key);sessionStorage.removeItem('ui-runner-owner');return {cleared:true};}`,waitForStableDom:false});
    if(r.isError)throw Error('无法安全清理本次页面');
    await adapter.callTool('close_page',{pageId});
  };
  try {
    const {login}=await import(root+'/packages/qa-auth/src/login.ts');
    const session=await loginWithOneTransportRetry(login,{accountFile:root+'/.secrets/accounts.qa.local.yaml',accountRef:'qa.commercial_client.primary'});
    const at=Date.now();const data={device:session.deviceKey,token:{type:session.tokenType,access:session.accessToken,refresh:session.refreshToken,time:at},user:session.browserUser,activity:at};
    let code=`() => {if(location.origin!=='https://qasalescloud.gree.com')throw Error('origin');const v=${JSON.stringify(data)};localStorage.setItem('shopping-device-key',JSON.stringify(v.device));localStorage.setItem('shopping-token',JSON.stringify(v.token));localStorage.setItem('shopping-user',JSON.stringify(v.user));localStorage.setItem('shopping:timeout-logout:lastActivityAt',String(v.activity));sessionStorage.setItem('ui-runner-owner',${JSON.stringify(owner)});return {stored:true};}`;
    const injected=await adapter.callTool('evaluate_script',{pageId,function:code});
    code='';data.token.access='';data.token.refresh='';data.user={};session.accessToken='';session.refreshToken='';
    if(injected.isError)throw Error('会话准备失败');
    await adapter.callTool('emulate',{pageId,viewport:'1728x803x2'});
    await adapter.callTool('navigate_page',{pageId,type:'url',url:'https://qasalescloud.gree.com/consult/consult-technology'});
    const ready=mcpJson(await adapter.callTool('evaluate_script',{pageId,function:`async () => {const end=Date.now()+20000;while(Date.now()<end){if(document.querySelector('header,[role=banner]')?.innerText.includes('CQRain03')&&document.querySelector('tbody tr[data-row-key]'))return {ready:true,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},userAgent:navigator.userAgent};await new Promise(r=>setTimeout(r,100));}return {ready:false};}`,waitForStableDom:false}));
    if(!ready.ready)throw Error('页面身份或列表未就绪');
    return {pageId,metadata:ready,cleanup};
  }catch(error){
    await adapter.callTool('close_page',{pageId}).catch(()=>{});
    const code=error?.cause?.code;
    if(code && /^[A-Z_0-9-]+$/.test(code))throw new Error(`会话准备网络失败：${code}`);
    throw error;
  }
}
