/**
 * 已登录QA客户端、已选定项目的新建非标产品选型表单。
 * 仅通过页面DOM控件填写1张卡片，不请求业务API，不提交、不保存草稿。
 * 稳定能力ID：salescloud.client.consultation.prepare-nonstandard。
 * 在Chrome DevTools evaluate_script中调用本函数；参数由调用会话传入。
 */
async function prepareNonstandardConsultation(config) {
  const trace = [];
  let step = '检查执行条件';
  const started = Date.now();
  const normal = value => String(value ?? '').replace(/\s+/g, '').replace(/：/g, ':');
  const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const all = (scope, selector) => [...scope.querySelectorAll(selector)].filter(visible);
  const unique = (items, label) => {
    if (items.length !== 1) throw new Error(`${label}匹配${items.length}个，停止以免误操作`);
    return items[0];
  };
  const wait = async (check, label) => {
    const end = Math.min(Date.now() + 12000, started + 45000);
    while (Date.now() < end) {
      const value = check();
      if (value) return value;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`等待超时：${label}`);
  };
  const click = el => {
    if (!visible(el) || el.disabled || el.getAttribute('aria-disabled') === 'true') throw new Error('目标控件不可操作');
    el.scrollIntoView({block: 'center', behavior: 'instant'});
    el.focus();
    for (const type of ['mousedown', 'mouseup']) el.dispatchEvent(new MouseEvent(type, {bubbles: true, cancelable: true, view: window}));
    el.click();
  };
  const fill = (el, value) => {
    if (!visible(el) || el.disabled || el.readOnly) throw new Error('输入控件不可编辑');
    el.scrollIntoView({block: 'center', behavior: 'instant'});
    el.focus();
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', {bubbles: true}));
    el.dispatchEvent(new Event('change', {bubbles: true}));
  };
  const button = (scope, text) => unique(all(scope, 'button').filter(el => normal(el.innerText) === normal(text)), `按钮${text}`);
  const field = text => {
    const label = unique(all(document, 'label').filter(el => normal(el.innerText) === normal(text)), `字段${text}`);
    const item = label.closest('.ant-form-item');
    if (!item) throw new Error(`字段${text}缺少已核对的表单容器`);
    return item;
  };
  const dialog = () => all(document, '[role="dialog"]').find(el => el.innerText.includes('产品选择'));
  const radio = (scope, text) => unique(all(scope, 'label').filter(el => el.querySelector('input[type="radio"]') && normal(el.innerText) === normal(text)), `单选项${text}`);
  const selectionText = item => normal(item.querySelector('.ant-select-selection-item')?.textContent || '');
  const exactLeaf = (scope, text) => unique(all(scope, '*').filter(el => el.childElementCount === 0 && normal(el.textContent) === normal(text)), `选项${text}`);
  try {
    for (const key of ['account', 'projectCode', 'category', 'subcategory', 'series', 'model', 'modelSearch', 'engineeringDescription', 'selectionRequirement']) {
      if (typeof config[key] !== 'string' || !config[key].trim()) throw new Error(`缺少参数${key}`);
    }
    if (location.origin !== 'https://qasalescloud.gree.com' || location.pathname !== '/consult/consult-technology/add') throw new Error('必须位于QA客户端新建咨询单页面');
    if (document.body.innerText.includes('拖动滑块完成拼图')) throw new Error('需要用户手动完成滑块');
    const header = document.querySelector('header,[role="banner"]');
    if (!header || !header.innerText.includes(config.account)) throw new Error('当前账号与指定账号不符');
    if (!normal(document.body.innerText).includes('项目编号:' + normal(config.projectCode))) throw new Error('页面未绑定指定项目；先完成选择项目流程');
    if (all(document, 'label').filter(el => normal(el.innerText) === '产品系列').length !== 1) throw new Error('必须恰好只有1张咨询卡片');
    if (all(document, '[role="dialog"]').length) throw new Error('存在未处理弹窗');
    const seriesPath = [config.category, config.subcategory, config.series].join('/');
    step = '填写工程详细说明';
    const engineering = unique(all(document, 'textarea').filter(el => el.placeholder === '请填写项目重要性，和把握性分析'), '工程详细说明');
    if (engineering.value && engineering.value !== config.engineeringDescription) throw new Error('工程详细说明已有其他内容，停止覆盖');
    fill(engineering, config.engineeringDescription);
    trace.push('在工程详细说明输入本轮标识文字');
    step = '选择产品系列';
    if (selectionText(field('产品系列')) !== normal(seriesPath)) {
      click(unique(all(field('产品系列'), '.ant-select-selector'), '产品系列下拉入口'));
      const picker = await wait(dialog, '产品选择弹窗');
      click(radio(picker, config.category));
      const sub = await wait(() => all(picker, 'label').find(el => el.querySelector('input[type="radio"]') && normal(el.innerText) === normal(config.subcategory)), '目标产品小类');
      if (!sub.querySelector('input').checked) click(sub);
      await wait(() => normal(picker.innerText).includes(normal(config.series)), '目标产品系列');
      if (!normal(picker.innerText).includes('已选:' + normal(seriesPath))) click(exactLeaf(picker, config.series));
      await wait(() => normal(picker.innerText).includes('已选:' + normal(seriesPath)), '核对已选完整系列路径');
      click(button(picker, '确定'));
      await wait(() => !dialog() && selectionText(field('产品系列')) === normal(seriesPath), '系列回填并关闭弹窗');
      trace.push('产品选择：大类→核对小类及系列→确定');
    }
    step = '搜索并选择产品机型';
    if (selectionText(field('产品机型')) !== normal(config.model)) {
      const modelField = field('产品机型');
      click(unique(all(modelField, '.ant-select-selector'), '产品机型下拉入口'));
      const input = unique(all(modelField, 'input[role="combobox"]'), '产品机型搜索框');
      fill(input, config.modelSearch);
      const option = await wait(() => all(document, '*').find(el => el.childElementCount === 0 && normal(el.textContent) === normal(config.model) && !modelField.contains(el)), '目标机型候选');
      click(option);
      await wait(() => selectionText(field('产品机型')) === normal(config.model), '产品机型回填');
      trace.push('产品机型输入关键词，选择完整型号并核对回填');
    }
    step = '填写选型需求';
    // 该字段在现行页面没有label元素；后缀来自实际DOM核对，且上方已限定单卡片。
    const requirement = unique(all(document, 'textarea[id$="_stylingRequirements"]'), '选型需求文本框');
    if (requirement.value && requirement.value !== config.selectionRequirement) throw new Error('选型需求已有其他内容，停止覆盖');
    fill(requirement, config.selectionRequirement);
    for (const text of ['咨询货期', '核价信息']) {
      const label = unique(all(document, 'label').filter(el => el.querySelector('input[type="checkbox"]') && normal(el.innerText) === text), text);
      if (label.querySelector('input').checked) throw new Error(`${text}已勾选，本脚本不替调用者改变额外咨询范围`);
    }
    if (engineering.value !== config.engineeringDescription || requirement.value !== config.selectionRequirement) throw new Error('填写结果不一致');
    trace.push('填写选型需求，核对两项同时咨询均未勾选');
    button(document, '提交');
    return {status: 'ready_to_submit', submitted: false, account: config.account, projectCode: config.projectCode, series: seriesPath, model: config.model, engineeringDescription: engineering.value, selectionRequirement: requirement.value, cardCount: 1, trace};
  } catch (error) {
    return {status: 'blocked', submitted: false, step, reason: String(error.message || error), trace};
  }
}
