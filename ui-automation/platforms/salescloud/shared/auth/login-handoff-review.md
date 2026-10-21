# 商用平台登录交接核对

状态：2026-10-21已读取交接并核对关键代码。用户后续明确采用该纯代码登录方式后，已复用外部认证包建立sheldon/李博及lilytest/林莉的独立QA管理端会话，并完成对应业务页面身份核对。当前登记为`qa-admin-bridge-verified`；本库尚未新增独立可执行auth能力，完整Worker及固定快照恢复机制未接入。

## 来源

- 原会话：`Executor`，会话ID `019f930a-0d84-7350-b573-fa9668566bcd`。仅只读检索，没有向该会话发送消息。
- [原始交接文档](/Users/sheldon/Documents/GithubProject/GreeProject/docs/login-handoff.md)。该文件在源仓库当前为未跟踪文件，所以不能只凭Git提交号定位其内容。
- 源仓库读取时HEAD：`cede645feb77b3ee39bd11027ccfa3d690f7975b`；本轮未修改源仓库。
- 已核对[认证实现](/Users/sheldon/Documents/GithubProject/GreeProject/packages/qa-auth/src/login.ts)、[UI Worker](/Users/sheldon/Documents/GithubProject/GreeProject/automation/control_center/ui-worker.ts)、认证包README和认证说明。初次审阅未读取账号文件；后续运行由源`loadAccount/login`按指定账号引用加载本机配置，未打印密码、OAuth材料或完整会话。

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
| 成功定义 | 接口认证成功、浏览器身份就绪、业务操作成功分别判定；本轮两个管理端账号已有实际证据，见下文 |
| 恢复边界 | 源Worker按固定运行快照加载认证实现；恢复旧任务不能随意换成磁盘最新代码，更不能重放已有业务写入 |

## 登录契约如何纳入本库

1. 登录属于平台级`auth`能力，与业务表单和通用DOM控件分开；账号、环境和上下文应作为显式输入。
2. 本库索引只登记不含凭据的契约和实现位置；密码、Token、Cookie、验证码材料、完整存储值保留在受控的本机进程或用户指定凭据机制中，不经模型输出和Git传递。
3. 登录能力最终给业务流程的输出应是环境、端、账号引用、隔离上下文/页签引用以及身份核对状态。真实认证材料不作为普通步骤输出。
4. 会话恢复必须验证当前账号和只读落地页，再继续原业务状态；不得用“登录恢复”重新创建咨询单。
5. 当前仍以平台资料引用登记外部来源及实际验证范围，不建立没有完整调用封装的可执行`capability.json`占位项。源包及当前桥接方法可按下节复用；不能仅凭平台资料存在就认定本库有完整登录执行器。

## 本轮实际桥接与后续复用

- 来源账号路由：`qa.commercial_admin.sheldon`，显示李博，上下文`gree-qa-commercial-admin-sheldon`；`qa.commercial_admin.lily`，配置用户名`lilytest`，显示林莉，上下文`gree-qa-commercial-admin-lily`。后者对应用户给定的Lilytest账号，不能误用源默认管理员账号。
- 先读取环境配置并核对指定引用的用户名，使用Chrome DevTools在对应独立上下文创建同源`/login`页。
- 通过Node/TypeScript调用源`login('commercial_admin', {accountRef})`；未调用只支持默认账号的诊断CLI。源包完成自身滑块及OAuth流程，必要用户上下文字段由源包验证。
- 在工具编排内存中接收会话，按已核对的Worker管理端四个键建立浏览器状态，再导航至`/admin/consult/technical`。完整会话未作为模型输出、文档或文件写出；工具输出仅保留简短认证结果和页面核对信息。
- 分别核对页面显示李博、林莉，且可按真实子单号查询并执行获授权的接单、审批。本轮没有密码到期弹窗；未执行任何密码修改。
- 浏览器pageId由当次页面清单确定，不作为长期常量。恢复时先检查正在使用的账号和已完成业务状态，不重放创建、接单或审批。
- 证据：[71652运行记录](../../../../../requirements/71652/runs/20261021-ui-discovery.md)。本轮仅验证这两个QA管理端账号；客户端纯代码登录和UAT均未在本会话运行。

## 尚未接入的部分

- 当前源`login(platform, {accountFile, accountRef})`主动进入自动滑块流程，没有接收外部人工验证结果的公开参数。不能因为浏览器已经人工通过滑块，就假定调用它会跳过这一过程。
- 早期客户端页面登录的约定是滑块由用户手动完成。用户后续明确选择交接中的纯代码登录后，管理端已按源包实现执行；没有将算法移植到本库，不能继续把“用户每次手动滑块”写成当前唯一登录方式。
- 源命令行入口只选择platform，不能冒充指定UAT或附加账号的浏览器验收；本轮未运行这些命令。
- 源完整Worker还依赖快照、计划、账号路由及运行状态；不能只复制登录注入片段就声称完整恢复机制可用。
- 环境入口、账号别名映射和接入运行方式需在正式接入时明确；不得读取默认账号文件后无意登录成另一个人。

## 页面身份核验的复用要求

- 核对目标origin、平台端、账号引用及隔离上下文一致。
- 核对没有回到登录页，页面账号标签等于预期账号，目标只读页面加载完成。
- 必要用户信息和菜单请求没有认证错误；仅HTTP 200或写入浏览器存储不够。
- 账号能登录但看不到产品时，还需核对其组织和产品线权限；不能把权限问题归为定位器失效或私自替换业务数据。

源码说明、桥接实测与业务动作分别记录。上述两个QA管理端账号已有认证和浏览器实测；其他端、环境及完整恢复能力不继承通过结论。
