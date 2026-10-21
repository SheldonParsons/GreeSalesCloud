# 商用平台登录交接核对

状态：2026-10-21已读取交接文档并核对关键代码；未接入为可执行能力，未运行登录。本轮QA业务操作继续保持暂停。

## 来源

- 原会话：`Executor`，会话ID `019f930a-0d84-7350-b573-fa9668566bcd`。仅只读检索，没有向该会话发送消息。
- [原始交接文档](/Users/sheldon/Documents/GithubProject/GreeProject/docs/login-handoff.md)。该文件在源仓库当前为未跟踪文件，所以不能只凭Git提交号定位其内容。
- 源仓库读取时HEAD：`cede645feb77b3ee39bd11027ccfa3d690f7975b`；本轮未修改源仓库。
- 已核对[认证实现](/Users/sheldon/Documents/GithubProject/GreeProject/packages/qa-auth/src/login.ts)、[UI Worker](/Users/sheldon/Documents/GithubProject/GreeProject/automation/control_center/ui-worker.ts)、认证包README和认证说明。未读取真实账号文件。

| 来源文件 | 读取内容SHA-256 |
| --- | --- |
| `docs/login-handoff.md` | `dd5884f2373f7ce5ea888f0fb6e8add9d390a51e7f3e93d36751f0e6f5355fb9` |
| `packages/qa-auth/src/login.ts` | `ac0e342446274d465f90acf9c49c27d67da9fc2ba7726f067d5f52fd642e7eff` |
| `automation/control_center/ui-worker.ts` | `1f6e7b443f8cdeb95a7884d7d2ade6e6e075be3401a62e3b1584e531c1b94bbd` |

原始绝对路径用于本机溯源；其他机器若没有GreeProject检出目录，必须先取得对应来源，不能假定登录实现已包含在本仓库内。本文件是接入摘要，不是源认证代码副本。

## 已确认的实现边界

| 内容 | 核对结论 |
| --- | --- |
| 认证模式 | Node/TypeScript调用真实认证接口取得会话，UI Worker通过Chrome DevTools在同源隔离页签中建立浏览器登录态，再导航并核对身份 |
| 适用范围 | 商用客户端、商用管理端；QA和UAT分别管理。CRM、IAM不在该交接已验证范围内 |
| 平台映射 | 本库`salescloud/client`对应源`commercial_client`；`salescloud/admin`对应源`commercial_admin` |
| 账号引用 | 源使用`<environment>.<platform>.<account_alias>`；不能只按平台选择账号，也不能把历史默认账号当本次账号 |
| 隔离上下文 | 从源环境配置`account_profiles`取得，不凭别名自行拼接；同平台不同账号也需隔离 |
| 登录入口 | 认证HTTP引导：客户端`/login`、管理端`/admin/login`；Worker用于建立同源浏览器存储的起始页统一是`/login`，两者不能混淆 |
| 用户上下文 | 需保留完整组织和权限上下文，关键字段包括`passwordUpdatedTime`与`rootOrgId`；不能只放id和name |
| 成功定义 | 接口认证成功、浏览器身份就绪、业务操作成功分别判定；本库目前没有新增登录验证证据 |
| 恢复边界 | 源Worker按固定运行快照加载认证实现；恢复旧任务不能随意换成磁盘最新代码，更不能重放已有业务写入 |

## 登录契约如何纳入本库

1. 登录属于平台级`auth`能力，与业务表单和通用DOM控件分开；账号、环境和上下文应作为显式输入。
2. 本库索引只登记不含凭据的契约和实现位置；密码、Token、Cookie、验证码材料、完整存储值保留在受控的本机进程或用户指定凭据机制中，不经模型输出和Git传递。
3. 登录能力最终给业务流程的输出应是环境、端、账号引用、隔离上下文/页签引用以及身份核对状态。真实认证材料不作为普通步骤输出。
4. 会话恢复必须验证当前账号和只读落地页，再继续原业务状态；不得用“登录恢复”重新创建咨询单。
5. 本轮只登记该外部来源，不建立可执行`capability.json`占位项，避免其他会话把“资料已读”误当“登录能力已接入”。接入和验证后再生成能力索引条目。

## 当前不能直接套用的部分

- 当前源`login(platform, {accountFile, accountRef})`主动进入自动滑块流程，没有接收外部人工验证结果的公开参数。不能因为浏览器已经人工通过滑块，就假定调用它会跳过这一过程。
- 本会话当前约定是滑块由用户手动完成；本轮不移植或执行自动解题流程。后续接入采用正式认证入口或已经由用户验证的会话，并保留人工接管点。
- 源命令行入口只选择platform，不能冒充指定UAT或附加账号的浏览器验收；本轮未运行这些命令。
- 源完整Worker还依赖快照、计划、账号路由及运行状态；不能只复制登录注入片段就声称完整恢复机制可用。
- 环境入口、账号别名映射和接入运行方式需在正式接入时明确；不得读取默认账号文件后无意登录成另一个人。

## 页面身份核验的复用要求

- 核对目标origin、平台端、账号引用及隔离上下文一致。
- 核对没有回到登录页，页面账号标签等于预期账号，目标只读页面加载完成。
- 必要用户信息和菜单请求没有认证错误；仅HTTP 200或写入浏览器存储不够。
- 账号能登录但看不到产品时，还需核对其组织和产品线权限；不能把权限问题归为定位器失效或私自替换业务数据。

上述是交接阅读和源码核对结果，不是本次接口认证、浏览器登录或业务执行的通过证据。
