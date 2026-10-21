/** 对已查询到的专用子单完成销售公司技术主管审批。写操作仅触发一次。 */
async function approveInternalConsultation(config) {
  let writeDispatched = false;
  const visible = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const all = (root, selector) => [...root.querySelectorAll(selector)].filter(visible);
  const normal = value => String(value ?? '').replace(/\s/g, '');
  const unique = (items, name) => {
    if (items.length !== 1) throw new Error(`${name}匹配${items.length}个`);
    return items[0];
  };
  const wait = async (check, name) => {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const value = check();
      if (value) return value;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`等待超时：${name}`);
  };
  const rows = () => all(document, 'tbody tr[data-row-key]').filter(r => [...r.querySelectorAll('td')].some(e => e.innerText.trim() === config.childNumber));
  const cells = row => [...row.querySelectorAll('td')].map(e => normal(e.innerText));
  try {
    for (const key of ['account', 'childNumber', 'projectCode', 'marker', 'comment']) if (!config[key]?.trim()) throw new Error(`缺少参数${key}`);
    if (location.origin !== 'https://qasalescloud.gree.com' || location.pathname !== '/consult/consult-technology') throw new Error('不在QA客户端列表');
    if (!document.querySelector('header,[role="banner"]')?.innerText.includes(config.account)) throw new Error('账号不符');
    const dialogs = all(document, '[role="dialog"]');
    if (dialogs.length) {
      const detail = unique(dialogs, '当前抽屉');
      if (detail.querySelector('.ant-drawer-header')?.innerText.trim() !== '查看' || !detail.innerText.includes(config.childNumber) || !detail.innerText.includes(config.marker)) throw new Error('存在其他弹窗');
      unique(all(detail, '.drawers-header [aria-label="close"]'), '详情关闭').click();
      await wait(() => !visible(detail), '详情关闭');
    }
    const row = unique(rows(), '目标行');
    if (!cells(row).includes(normal(config.projectCode))) throw new Error('项目不符');
    if (cells(row).includes('待接单')) return {status: 'already_approved', writeDispatched, childNumber: config.childNumber};
    if (!cells(row).includes('待确认(技术主管审批)')) throw new Error('不是待确认的技术主管审批');
    unique(all(row, 'a,button,span').filter(e => e.childElementCount === 0 && e.innerText.trim() === '审批'), '本行审批').click();
    const drawer = await wait(() => all(document, '[role="dialog"]').find(e => e.querySelector('.ant-drawer-header')?.innerText.trim() === '审批' && e.innerText.includes(config.childNumber) && e.innerText.includes(config.marker)), '审批抽屉');
    if (!drawer.innerText.includes('技术主管审批')) throw new Error('审批节点不符');
    const agree = unique(all(drawer, 'label').filter(e => e.querySelector('input[type="radio"]') && e.innerText.trim() === '同意'), '同意选项');
    agree.scrollIntoView({block: 'center', behavior: 'instant'});
    agree.click();
    const comment = unique(all(drawer, 'textarea[placeholder="请输入审批意见"]'), '审批意见');
    if (comment.value && comment.value !== config.comment) throw new Error('审批意见已有其他内容');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(comment, config.comment);
    comment.dispatchEvent(new InputEvent('input', {bubbles: true, inputType: 'insertText', data: config.comment}));
    comment.dispatchEvent(new Event('change', {bubbles: true}));
    comment.blur();
    await wait(() => agree.querySelector('input').checked && comment.value === config.comment, '审批输入');
    const submit = unique(all(drawer, 'button').filter(e => normal(e.innerText) === '提交' && !e.disabled), '审批提交');
    submit.scrollIntoView({block: 'center', behavior: 'instant'});
    await wait(() => {
      const r = submit.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return top && (submit.contains(top) || top.contains(submit));
    }, '提交按钮不被遮挡');
    writeDispatched = true;
    submit.click();
    await wait(() => !visible(drawer), '审批抽屉关闭');
    await wait(() => rows().length === 1 && cells(rows()[0]).includes('待接单'), '同子单待接单');
    return {status: 'approved', writeDispatched, childNumber: config.childNumber, businessStatus: '待接单'};
  } catch (error) {
    return {status: writeDispatched ? 'reconcile_required' : 'blocked', writeDispatched, reason: String(error.message || error)};
  }
}
