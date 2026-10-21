/** 从已查询的客户端列表打开指定子单并回读，只操作DOM，不修改业务状态。 */
async function readConsultationChildDetail(config) {
  const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const all = (scope, selector) => [...scope.querySelectorAll(selector)].filter(visible);
  const normal = value => String(value ?? '').replace(/\s+/g, '');
  const unique = (items, name) => {
    if (items.length !== 1) throw new Error(`${name}匹配${items.length}个`);
    return items[0];
  };
  let opened = false;
  try {
    for (const key of ['account', 'childNumber', 'mainNumber', 'projectCode', 'series', 'model', 'engineeringDescription', 'selectionRequirement', 'expectedStatus']) {
      if (typeof config[key] !== 'string' || !config[key].trim()) throw new Error(`缺少参数${key}`);
    }
    if (location.origin !== 'https://qasalescloud.gree.com' || location.pathname !== '/consult/consult-technology') throw new Error('不是QA客户端项目技术咨询列表');
    const header = document.querySelector('header,[role="banner"]');
    if (!header || !header.innerText.includes(config.account)) throw new Error('账号不符');
    if (all(document, '[role="dialog"]').length) throw new Error('存在未处理抽屉或弹窗');
    const row = unique(all(document, 'tbody tr[data-row-key]').filter(r =>
      [...r.querySelectorAll('td')].some(td => td.innerText.trim() === config.childNumber)), '目标子单行');
    const cells = [...row.querySelectorAll('td')].map(td => td.innerText.trim());
    for (const value of [config.mainNumber, config.projectCode, config.model]) {
      if (!cells.includes(value)) throw new Error('列表业务身份不符');
    }
    if (!cells.some(value => normal(value) === normal(config.expectedStatus))) throw new Error('列表状态不符');
    const view = unique(all(row, 'a,button,span').filter(el => el.childElementCount === 0 && el.innerText.trim() === '查看'), '本行查看');
    view.scrollIntoView({block: 'center', behavior: 'instant'});
    view.click();
    opened = true;
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      const drawers = all(document, '[role="dialog"]').filter(d => d.querySelector('.ant-drawer-header')?.innerText.trim() === '查看' && d.innerText.includes(config.childNumber));
      if (drawers.length > 1) throw new Error('详情抽屉不唯一');
      const drawer = drawers[0];
      if (drawer) {
        const text = drawer.innerText;
        const checks = Object.fromEntries(['childNumber', 'mainNumber', 'projectCode', 'series', 'model', 'engineeringDescription', 'selectionRequirement'].map(key => [key, text.includes(config[key])]));
        if (Object.values(checks).every(Boolean)) return {status: 'detail_verified', opened, childNumber: config.childNumber, mainNumber: config.mainNumber, businessStatus: config.expectedStatus, checks};
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('详情未加载完成或字段不匹配');
  } catch (error) {
    return {status: 'blocked', opened, reason: String(error.message || error)};
  }
}
