/** 从管理端已定位的目标行进入查看并接单一次；业务状态由客户端继续回读。 */
async function acceptListedConsultation(config) {
  let writeDispatched = false;
  const visible = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const all = (root, selector) => [...root.querySelectorAll(selector)].filter(visible);
  const norm = value => String(value ?? '').replace(/\s/g, '');
  const unique = (items, label) => {
    if (items.length !== 1) throw new Error(`${label}匹配${items.length}个`);
    return items[0];
  };
  const wait = async (check, label) => {
    const end = Date.now() + 15000;
    while (Date.now() < end) {
      const value = check();
      if (value) return value;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`等待超时：${label}`);
  };
  try {
    for (const key of ['accountLabel', 'childNumber', 'projectCode', 'model', 'marker']) if (!config[key]?.trim()) throw new Error(`缺少参数${key}`);
    if (location.origin !== 'https://qasalescloud.gree.com' || location.pathname !== '/admin/consult/technical') throw new Error('不在QA管理端咨询列表');
    const account = unique(all(document, '.header-right .ant-dropdown-trigger'), '顶部账号入口');
    if (account.innerText.trim() !== config.accountLabel) throw new Error('账号标签不符');
    if (all(document, '[role="dialog"]').length) throw new Error('存在未处理弹窗');
    const row = unique(all(document, 'tbody tr[data-row-key]').filter(r => [...r.querySelectorAll('td')].some(c => c.innerText.trim() === config.childNumber)), '目标行');
    const cells = [...row.querySelectorAll('td')].map(c => c.innerText.trim());
    if (!['待接单', config.projectCode, config.model].every(v => cells.includes(v))) throw new Error('项目、机型或待接单状态不符');
    unique(all(row, 'a,button,span').filter(e => e.childElementCount === 0 && e.innerText.trim() === '查看'), '本行查看').click();
    const drawer = await wait(() => all(document, '[role="dialog"]').find(d => d.querySelector('.ant-drawer-header')?.innerText.trim() === '查看' && [config.childNumber, config.projectCode, config.model, config.marker].every(v => d.innerText.includes(v))), '目标详情及测试标识');
    const accept = unique(all(drawer, 'button').filter(b => norm(b.innerText) === '接单' && !b.disabled), '详情接单');
    accept.scrollIntoView({block: 'center', behavior: 'instant'});
    await wait(() => {
      const r = accept.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return top && (accept.contains(top) || top.contains(accept));
    }, '按钮不被遮挡');
    writeDispatched = true;
    accept.click();
    const message = await wait(() => all(document, '.ant-message-notice-content').map(e => e.innerText).find(t => t.includes('接单成功')), '接单反馈');
    await wait(() => !visible(drawer), '查看抽屉关闭');
    return {status: 'accept_feedback_observed', writeDispatched, childNumber: config.childNumber, message, next: '在客户端按同一子单号查询并核对已接单'};
  } catch (error) {
    return {status: writeDispatched ? 'reconcile_required' : 'blocked', writeDispatched, reason: String(error.message || error)};
  }
}
