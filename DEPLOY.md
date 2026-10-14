# Accessory Radar 内网部署说明

纯静态站点（index.html + app.js + style.css + config/ + data/ + fonts/），无构建依赖、无外部 CDN，字体已自托管于 `fonts/`（中文字体使用系统字体回退：苹方 / 微软雅黑 / 宋体），可完全离线运行。

## 方式一：Docker（nginx:alpine）

```bash
git clone git@github.com:Oliverztc/accessory-radar.git && cd accessory-radar
docker build -t accessory-radar .
docker run -d --name accessory-radar -p 8080:80 --restart unless-stopped accessory-radar
```

若希望 `git pull` 后无需重建镜像，可把仓库目录挂载进容器：

```bash
docker run -d --name accessory-radar -p 8080:80 --restart unless-stopped \
  -v $PWD:/usr/share/nginx/html:ro -v $PWD/nginx.conf:/etc/nginx/conf.d/default.conf:ro nginx:alpine
```

## 方式二：已有 nginx

```bash
git clone git@github.com:Oliverztc/accessory-radar.git /srv/accessory-radar
sudo cp /srv/accessory-radar/nginx.conf /etc/nginx/conf.d/accessory-radar.conf
# 将 conf 中的 root 改为 /srv/accessory-radar，按需修改 listen / server_name
sudo nginx -t && sudo nginx -s reload
```

挂在子路径（如 `/radar/`）时：用 `location /radar/ { alias /srv/accessory-radar/; }`，并在 `config/site.json` 中把 `base_path` 设为 `/radar/`（页面资源全部使用相对路径，子路径可直接工作）。

## 每日自动同步

日报每天由 `publish.sh` 发布到 Vercel 并推送到本仓库 `main` 分支。内网服务器用 cron 定时拉取即可：

```cron
# 每天 09:30 / 12:30 / 18:30 同步（挂载模式或已有 nginx 无需重启）
30 9,12,18 * * * cd /srv/accessory-radar && timeout 120 git pull --ff-only -q >> /var/log/accessory-radar-sync.log 2>&1
```

Docker 非挂载模式需在 pull 后重建：`git pull --ff-only && docker build -t accessory-radar . && docker rm -f accessory-radar && docker run -d ...`。

私有仓库请在服务器上配置只读 Deploy Key（GitHub 仓库 Settings → Deploy keys）。

## 修改配置

| 文件 | 内容 |
|---|---|
| `config/site.json` | 站点名称、标题、栏目开关 `sections`（daily/year/archive/brands/sources，设为 false 即隐藏导航）、配色 `palette`、字体栈 `fonts`、`base_path` |
| `config/brands.json` | 监测品牌：`name`、`aliases`（别名数组）、`watch_level`（P0/P1…）、`tier1`（箱包/眼镜/珠宝腕表/服配/玉石翡翠） |
| `config/sources.json` | 信源清单，按层级（一手信源 / 行业媒体 / 垂直媒体 / 趋势数据 / 趋势预测 / 产业带 / 资本和咨询 / 海外参照），每项 `name` + 可选 `url`；显示在「信源」页 |

修改后运行 `python3 build.py` 校验（配置与数据格式错误会列出并以非零退出）。

## 数据格式

见 [SCHEMA.md](SCHEMA.md)。日报文件为 `data/YYYY-MM-DD.json`，`data/index.json` 由 `build.py` 生成；全年回顾为 `data/2026-backfill.json`。
