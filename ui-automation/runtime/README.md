# 统一只读调用入口 v0.1

当前接入`query-and-read-child@0.1.0`及其依赖`read-child-detail@0.1.1`。其他三项填表、审批、接单脚本维持原调用方式，新入口拒绝执行它们；未增加写操作调度器。

## 调用方式

在仓库根目录安装锁定依赖：

```sh
npm ci --prefix ui-automation --ignore-scripts
```

准备本机请求JSON，包含`capability`、`environment`、`inputs`。输入字段见对应`capability.json`，当前入口要求声明的非空字符串，拒绝未知字段。不要把密码、Token或Cookie放入inputs。

```sh
node ui-automation/tools/run.mjs --request .local/my-run/request.json --validate-only
node ui-automation/tools/run.mjs --request .local/my-run/request.json --bootstrap .local/my-run/bootstrap.mjs --capture
```

第一条仅检查契约，不连接浏览器。第二条通过已配置的`chrome-devtools-headless`执行；`--mcp-server`可指定其他连接，但必须符合本次授权和bootstrap限制。适配器只支持本机STDIO配置，遵守工具允许/禁用清单；遇宿主审批要求或未支持的远程/间接环境变量配置时停止，不绕开这些设置。

JSON对象执行一条请求；JSON数组可在同一连接中执行同环境、平台、端和账号的请求。遇首个阻塞即返回控制权，后续条目未执行。共享连接不跳过前置条件：当前组合只会关闭本目标的只读详情，其他目标的遗留抽屉会停止操作，由调用方核对和清理。

CLI退出码0表示请求/执行及清理未报错，退出码2表示其中有阻塞；逐条能力通过不覆盖后续清理问题。`--validate-only`的0仍只表示本地校验通过。

`--capture`将检查点保存到本机，不把整张图回传模型；失败时也尝试取证，取证失败不覆盖原失败步骤。`--full`显式返回详细结构回执，正常路径不使用该选项。

## 会话准备

bootstrap由调用方提供，接口为`bootstrap({adapter, request, capability})`，返回`{pageId, cleanup}`。它负责按本次环境/角色准备独立页面并实际核对身份，cleanup仅清理自己创建的页面和会话。`adapter.callTool(name, args)`仍调用Chrome DevTools MCP。入口不搜索凭据、不猜旧pageId，不把认证准备当SSO验收。

[QA客户端示例](../examples/greeproject-qa-client-bootstrap.mjs)仅包装调用外部GreeProject认证包，没有复制认证算法或凭据；限定`qa.commercial_client.primary`、CQRain03、QA客户端和专用无界面连接。外部仓库默认是当前仓库旁的`GreeProject`，可用本机`GREEPROJECT_ROOT`指定。认证入口源码摘要须与[登录交接](../platforms/salescloud/shared/auth/login-handoff-review.md)一致；源项目依赖及账号文件由本机按该交接准备。其他账号/平台不能直接套用示例。

示例仅在认证准备遇已分类的暂态网络错误时重试一次，凭据拒绝、未知错误和页面业务动作不自动重试。这不改变写操作结果不明必须先对账的规则。

外部认证包是TypeScript。Node 20环境下，两个仓库相邻时的本机示例调用为：

```sh
node --import ../GreeProject/node_modules/tsx/dist/loader.mjs ui-automation/tools/run.mjs --request .local/my-run/request.json --bootstrap ui-automation/examples/greeproject-qa-client-bootstrap.mjs --capture
```

已有持久MCP连接的调用方可直接使用`createRunner({callTool})`和`runner.run(request, {pageId})`，避免反复建连接、认证或加载目录。runner固定能力版本、入口源码及契约摘要；这些文件变化后停止调用，不沿用旧缓存。运行库/共享模块更新后应结束本次执行进程并重新加载，不能仅依赖Node模块缓存。没有后台daemon或跨会话浏览器池；资料目录被其他任务占用时不得删除锁或强制关闭进程。

## 执行与证据

- 组合流程：核对账号/页面→必要时关闭本目标只读详情→重置筛选→取得当前输入框和按钮UID→MCP原生输入、点击查询→核对唯一行及业务字段→复用详情能力核对7项字段。没有直接调用业务查询接口。
- 主机端读取源码和完整快照，默认只返回状态、目标、15项断言汇总、耗时、工具调用数和回执路径。保留原生输入/点击，不以改变控件内部状态代替真实交互。
- 每次运行在`.local/ui-runs/<runId>/`保存原子更新的`receipt.json`及逐步`mcp.jsonl`；按需保存`checkpoint.png`并检查实际落地。目录0700、文件0600。详细证据可能包含业务信息，不直接提交Git。
- runId自动生成，也可指定安全标识；已存在时拒绝覆盖或静默重跑。复测使用新runId，保留前一次结果。
- `passed`要求返回已声明的成功状态且布尔断言非空、全部通过；其他情况为`blocked`并给出阶段和原因。局部能力通过不自动更新Mind或整轮需求统计。
- 源码/契约漂移、MCP异常、身份或控件不符均不自动重试。需求会话按失败步骤读取证据，再判断是否属于业务BUG。

本地检查运行`npm test --prefix ui-automation`，目录一致性运行`node ui-automation/tools/catalog.mjs check`；两者都不能代替真实页面验证。

## 对照与限制

[2026-10-28对照](../experiments/ui-entry-benchmark-20261028.md)记录耗时、回执体积和估算Token，未进行两组模型的实付Token测试。CLI冷启动、认证、截图开销与已就绪页面内的流程耗时分开记录。新增角色、环境、控件或写操作仍须单独验证。
