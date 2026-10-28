# 业务环境

来源：用户在本项目初始规划会话中提供。记录日期：2026-09-20。以下为入口记录，尚未实际访问验证。

| 环境 | 客户端 | 管理端 | 访问条件 |
| --- | --- | --- | --- |
| 公网 | https://salescloud.gree.com/login | https://salescloud.gree.com/admin/login | 具体账号和执行范围按当期任务确认 |
| UAT | https://presalescloud.gree.com/login | https://presalescloud.gree.com/admin/login | 网络及登录条件待执行时验证 |
| 测试（常用） | https://qasalescloud.gree.com/login | https://qasalescloud.gree.com/admin/login | 用户需切换到对应 WiFi；网络名称未提供 |

每次执行记录目标系统、环境、版本或部署时间（未知则注明）、账号角色及执行时间。常用环境不代表已经联网或已经获得执行授权；执行目标按当期任务确定。

无法访问测试环境时先确认网络条件，记录为阻塞，不自动改用 UAT 或公网执行。同一用例在不同环境中的结果分别保存。

上述网址是登录入口，不能据此猜测接口地址或请求参数。接口测试依据当期接口材料或实际页面请求确认。

## 金叶轮QA（2026-10-28用户提供）

入口：`http://gree-gis-frontend.gis-qa/login`。当前授权需求68701，只测试菜单管理与数据字典，账号/角色仅作必要准备。用户已提供管理员和测试账号，本机引用及执行边界见[启动交接](../governance/68701-ui-test-launch-20261028.md)。本条只登记入口与授权，实际连通、身份、部署版本及登录脚本兼容性由该需求运行证据确认；不沿用商用系统认证或猜测其他环境入口。
