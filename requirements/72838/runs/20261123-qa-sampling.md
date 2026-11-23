# 72838 QA 无界面采样记录（2026-11-23）

- 环境：QA 商用管理端 qasalescloud.gree.com；实际构建号未知。计划使用 `qa.commercial_admin.sheldon`，尚未建立登录会话。
- 范围：只读采样技术咨询单入口、红标、页签、抽屉及现有子单；不执行正式用例或修改业务数据。
- 实际操作：核对独立 `chrome-devtools-headless` 配置为启用且带 `--headless`；尝试通过项目既有 stdio MCP 方式启动独立临时 profile。启动返回 `chrome-devtools-mcp: command not found`，MCP 连接关闭；本机 npm 缓存未找到该服务入口。
- 结果：阻塞，未打开 QA 页面、未认证、未取得业务样本或截图。无法判断入口、权限、数据及需求是否部署。未使用日常可见 Chrome 或其他浏览器后备。
- 证据：本机脚本 `.local/72838-sampling/sample.mjs`；本次未创建页面，MCP 客户端已关闭，无页面需清理。无业务写入。
- 后续：恢复本机 `chrome-devtools-mcp@1.12.0` 可执行环境后，重新启动独立无界面连接并按原范围采样。
