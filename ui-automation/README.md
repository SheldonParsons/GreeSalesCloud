# UI自动化通用件

本目录是多个平台、多个会话共用的页面操作依赖入口。当前有四项经指定QA数据核对的能力：表单准备、子单详情回读、客户端内部审批、管理端接单。属于试行基础，不代表完整执行器已建立。

## 分类与目录

```text
ui-automation/
├── README.md                         # 人工入口、使用和扩展约定
├── catalog.json                      # 生成的统一索引，不手工编辑
├── tools/catalog.mjs                 # 构建、校验、检索和依赖解析
├── platforms/
│   └── <平台ID>/
│       ├── platform.json             # 平台、端及已登记环境
│       └── <端ID>/<业务模块>/<能力名>/
│           ├── capability.json       # 能力契约、版本、依赖和验证范围
│           └── run.js                # 实现
└── shared/<领域>/<能力名>/            # 真正跨平台的能力，有实现时再建立
```

- 平台是系统归属，端区分客户端、管理端等界面；QA/UAT等环境放在平台元数据和调用参数中，不复制多套代码目录。
- 业务模块如咨询单、订单、用户管理；能力类型用`kind`区分`auth`、`navigation`、`component`、`flow`，统一索引检索，不按需求编号堆放共用实现。
- 相同名称的控件只有在行为和契约一致时才提升到`shared`。平台专属选择器留在平台目录，不能把一个系统的“确定”按钮逻辑当成全部平台通用。
- `requirements/`继续保存需求、用例、数据约束和执行证据，通过稳定能力ID引用此处；本目录不保存真实业务单号和运行结果。
- `scripts/`保留其他临时或任务脚本。旧的`browser-flows`入口仅作迁移提示，不维护第二份实现。

## 查找与引用

从仓库根目录运行：

```sh
node ui-automation/tools/catalog.mjs build
node ui-automation/tools/catalog.mjs check
node ui-automation/tools/catalog.mjs list --platform salescloud --surface client
node ui-automation/tools/catalog.mjs platform salescloud
node ui-automation/tools/catalog.mjs get salescloud.client.consultation.prepare-nonstandard
node ui-automation/tools/catalog.mjs resolve salescloud.client.consultation.prepare-nonstandard
```

`capability.json`是能力元数据的唯一维护源，`catalog.json`由工具生成。`check`检查索引是否过期；`resolve`按依赖先后返回文件及版本，只解析、不执行页面操作。调用会话必须先核对授权范围、目标页面、环境、账号和验证范围，不能仅凭索引中存在条目就执行。

## 能力契约

每项能力必须明确：稳定ID、实现版本、平台/端/模块、类型、入口函数、运行位置及适配器、输入、输出、前置条件、效果、支持环境、依赖和验证证据。

- ID不随文件改名或需求变更而改变，例如`salescloud.client.consultation.prepare-nonstandard`。
- 实现版本使用语义版本号，与业务系统发版版本分开。依赖指定确切版本；升级不兼容行为时同时评估依赖方，不隐式漂移。
- `entry.runtime`区分`browser-function`和`node-function`；浏览器函数通过Chrome DevTools调用，后续纯代码登录按交接文档确定适配方式，不塞进DOM控件脚本。
- 当前实现入口使用具名函数声明，`entry.functionName`必须与实际声明一致；索引校验只检查语法和声明，不执行函数。
- 输出必须区分完成、准备就绪、需要人工介入和阻塞。页面准备完成不等于业务提交成功，提交反馈不等于保存状态已回读。
- `verification`注明日期、环境、已核对范围和证据。其他环境、平台或版本未验证时不继承通过结论。
- 当前每个ID维护一个现行版本，历史版本通过Git追溯。需要并存多版本时再扩展加载机制，当前不声称支持并存执行。

## 登录、会话和运行数据

登录作为独立`auth`能力。DOM操作、协议登录和会话恢复的实现可不同，但调用方都应取得明确的平台、端、环境、账号角色和会话引用，再在目标页面核对身份。

账号密码、Token、Cookie和浏览器会话仅放本机`.local/`或用户指定的凭据机制中；平台配置及能力契约不保存秘密。不同平台、端、环境和角色的会话分别管理，跨角色不共享一个不明身份的页面。浏览器pageId、快照uid属于当次运行值，不写成长期定位常量。

已从“Executor”会话定位并读取GreeProject登录交接，核对摘要见[平台登录资料](platforms/salescloud/shared/auth/login-handoff-review.md)，可通过`platform salescloud`取得索引入口。用户恢复探索后，已复用该外部认证包建立两个QA管理端账号的独立浏览器会话，并核对身份和业务访问。当前资料状态为`qa-admin-bridge-verified`；认证包仍在外部仓库，未登记本库可执行auth能力，也不把一次桥接成功等同完整Worker恢复机制或跨环境验证。

## 扩展与验证

1. 新平台增加独立`platform.json`，填写稳定平台ID、端和已确认环境入口。
2. 在对应端及业务模块下增加能力目录、实现和契约。复用前先检索现有ID，不复制其他需求目录中的旧脚本。
3. 新交互先通过真实页面核对，再固化为连续操作；已知片段连续执行，在关键结果处检查。
4. 执行`build`和`check`，检查重复ID、入口文件、平台/环境归属、依赖版本和循环依赖。
5. 首次实际使用后登记验证范围及需求证据。校验工具只验证本地目录和契约，不做登录或业务请求。

各能力的验证范围以契约为准。表单准备不提交；回读不修改单据；内部审批只支持已授权专用单的销司同意；接单只取得反馈，仍需调用方用同一子单号回读业务状态。工具目录权限与业务附件规则分开记录，不能在自动上传被拒绝时静默换目录绕过限制。
