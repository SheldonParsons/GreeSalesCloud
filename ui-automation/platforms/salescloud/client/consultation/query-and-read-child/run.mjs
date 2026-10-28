import {mcpText, uniqueSnapshotUid} from '../../../../../runtime/receipt.mjs';

/** 已观察的QA客户端列表组件；动作只包括重置、查询及关闭本目标的只读详情。 */
export async function consultationQueryPage({action, config, origin}) {
  const visible = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const norm = s => String(s ?? '').replace(/\s+/g, '');
  const unique = (items, label) => {
    if (items.length !== 1) throw new Error(`${label}匹配${items.length}个`);
    return items[0];
  };
  const wait = async (predicate, label) => {
    const end = performance.now() + 12000;
    while (performance.now() < end) {
      const value = predicate();
      if (value) return value;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error(`等待超时：${label}`);
  };
  const click = async (e, label) => {
    if (!e) throw new Error(`${label}不存在`);
    e.scrollIntoView({block: 'center', behavior: 'instant'});
    await wait(() => {
      if (!visible(e) || e.disabled || e.getAttribute('aria-disabled') === 'true') return false;
      const r = e.getBoundingClientRect(), top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return top && (e.contains(top) || top.contains(e));
    }, `${label}可操作且无遮挡`);
    e.click();
  };
  const header = document.querySelector('header,[role="banner"]');
  if (location.origin !== origin || location.pathname !== '/consult/consult-technology') throw new Error('不是本次QA客户端咨询列表');
  // 头像字母和昵称在整段innerText中可能相连（如CCQRain03），核对独立可见文本节点。
  if (!header || ![...header.querySelectorAll('*')].some(e => visible(e) && e.childElementCount === 0 && e.textContent.trim() === config.account)) throw new Error('当前账号不符');
  const dialogs = () => [...document.querySelectorAll('[role="dialog"]')].filter(visible);
  const button = text => unique([...document.querySelectorAll('button')].filter(e => visible(e) && norm(e.innerText) === text), text);

  if (['prepare', 'close-only', 'preflight'].includes(action)) {
    if (dialogs().length) {
      const d = unique(dialogs(), '现有抽屉');
      if (d.querySelector('.ant-drawer-header')?.innerText.trim() !== '查看' || ![config.childNumber, config.mainNumber].every(s => d.innerText.includes(s))) throw new Error('存在其他单据或可编辑弹窗，停止操作');
      const close = unique([...d.querySelectorAll('.ant-drawer-header [aria-label="close"]')].filter(visible), '详情关闭');
      await click(close, '详情关闭');
      await wait(() => !visible(d), '只读详情关闭');
    }
    if (action !== 'prepare') return {status: 'page_ready', checks: {account: true, page: true}};
    await click(button('重置'), '重置按钮');
    // 等React完成本次重置渲染，再检查真实控件和加载状态；不绕过受控输入状态。
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await wait(() => ['#codeAllLike', '#itemCodeAllLike', '#projectCodeLike'].every(s => document.querySelector(s)?.value === '') && ![...document.querySelectorAll('.ant-spin-spinning')].some(visible), '筛选重置');
    return {status: 'query_ready', checks: {account: true, page: true, filtersReset: true}};
  }
  if (action === 'wait-reset') {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await wait(() => ['#codeAllLike', '#itemCodeAllLike', '#projectCodeLike'].every(s => document.querySelector(s)?.value === '') && ![...document.querySelectorAll('.ant-spin-spinning')].some(visible), '筛选重置');
    return {status: 'query_ready', checks: {account: true, page: true, filtersReset: true}};
  }
  if (action === 'wait-query') {
    if (dialogs().length) throw new Error('查询前存在弹窗');
    if (document.querySelector('#itemCodeAllLike')?.value !== config.childNumber) throw new Error('查询输入未生效');
    const start = performance.now();
    const checks = await wait(() => {
      if ([...document.querySelectorAll('.ant-spin-spinning')].some(visible)) return false;
      const rows = [...document.querySelectorAll('tbody tr[data-row-key]')].filter(visible);
      if (rows.length !== 1) return false;
      const cells = [...rows[0].querySelectorAll('td')].map(c => c.innerText.trim());
      const result = {
        uniqueChild: cells.includes(config.childNumber), mainNumber: cells.includes(config.mainNumber),
        project: cells.includes(config.projectCode), model: cells.includes(config.model),
        status: cells.some(c => norm(c) === norm(config.expectedStatus)),
      };
      return Object.values(result).every(Boolean) ? result : false;
    }, '唯一目标行及业务字段');
    return {status: 'query_verified', checks, durationMs: Math.round(performance.now() - start)};
  }
  throw new Error('未知只读动作');
}

/** 统一流程在主机侧编排MCP，原生输入处理React控件；详情复用已登记能力。 */
export async function queryAndReadConsultation(config, ctx) {
  const ready = await ctx.evaluate(consultationQueryPage, {action: 'prepare', config, origin: ctx.origin}, 'prepare-query');
  const snapshot = mcpText(await ctx.tool('take_snapshot', {}, 'locate-query-input'));
  const inputUid = uniqueSnapshotUid(snapshot, /textbox "咨询子单号"/, '咨询子单号输入框');
  const queryUid = uniqueSnapshotUid(snapshot, /button "查\s*询"/, '查询按钮');
  await ctx.tool('fill', {uid: inputUid, value: config.childNumber}, 'native-query-input');
  await ctx.tool('click', {uid: queryUid}, 'native-query-click');
  const query = await ctx.evaluate(consultationQueryPage, {action: 'wait-query', config, origin: ctx.origin}, 'verify-query');
  const detail = await ctx.runDependency('salescloud.client.consultation.read-child-detail', config);
  if (detail.status !== 'detail_verified') return {status: 'blocked', reason: detail.reason || '详情未通过', checks: {prepare: ready.checks, query: query.checks}};
  return {status: 'query_detail_verified', checks: {prepare: ready.checks, query: query.checks, detail: detail.checks}, businessStatus: detail.businessStatus};
}
