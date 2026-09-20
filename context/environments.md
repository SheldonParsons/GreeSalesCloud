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
