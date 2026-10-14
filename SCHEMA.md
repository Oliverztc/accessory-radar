# 配饰雷达 数据格式

每天一个文件：`data/YYYY-MM-DD.json`（日期按 Asia/Shanghai）。`data/index.json` 由 `build.py` 自动生成，勿手改。
品牌主数据在 `config/brands.json`（可加 "aliases": []）：`[{ "name", "watch_level": "P0|P1", "tier1": "箱包|眼镜|珠宝腕表|服配|玉石翡翠|待确认" }]`。

## 枚举
- `tier1`：`箱包` `眼镜` `珠宝腕表` `服配` `玉石翡翠`（行业动态另可用 `综合`）
- `importance`：整数 1–5（5 最重要）
- `segment`（行业动态，选填但建议填写）：`奢侈品` `轻奢` `大众`
- `stage`：`萌芽` `上升` `成熟`
- `type`（建议）：`新品` `数据` `政策` `市场` `营销` `资本` `渠道` `深度`

## 日文件结构
```jsonc
{
  "date": "2026-10-14",            // 必填，须与文件名一致
  "headline": "一句话要点",          // 选填
  "summary": "当日摘要段落",          // 选填
  "industry_news": [                // 第一层 行业动态
    {"date":"YYYY-MM-DD","source":"媒体名","title":"原文标题","url":"https://...",
     "tier1":"眼镜","type":"新品","importance":4,"segment":"轻奢","summary":"摘要"}
  ],
  "brand_news": [                   // 第二层 品牌动态；brand 须与 config/brands.json 的 name 完全一致
    {"brand":"新秀丽","date":"YYYY-MM-DD","source":"...","title":"...","url":"https://...","summary":"..."}
    // watch_level / tier1 默认取自 config/brands.json，可在条目中覆盖 tier1
  ],
  "insights": [                     // 第三层 赛道洞察（长文）
    {"title":"...","tier1":"珠宝腕表","body":"段落之间用空行(\\n\\n)分隔","refs":[{"title":"...","url":"https://..."}]}
  ],
  "trends": [                       // 第四层 细分趋势与机会
    {"title":"...","tier1":"眼镜","stage":"上升","description":"...","opportunity":"...",
     "evidence":[{"title":"...","url":"https://..."}]}
  ],
  "brand_insights": [               // 第五层 品牌深度洞察（P0/P1 品牌，基于深度报道）
    {"brand":"山下有松","tier1":"箱包","title":"...","body":"战略/渠道/产品/定价/竞争，段落用空行分隔",
     "investor_view":"投资视角","operator_view":"经营视角","sources":[{"title":"...","url":"https://..."}]}
  ],
  "reading_list": [                 // 深度阅读清单（BoF、Vogue Business、华丽志、LADYMAX、品牌星球、36氪等）
    {"title":"...","source":"BoF","date":"YYYY-MM-DD","url":"https://...","tier1":"箱包"}
  ],
  "brand_scan": {"window":"YYYY-MM-DD..YYYY-MM-DD","method":"检索方法","note":"说明"},  // 选填，品牌覆盖说明
  "sources": [{"name":"媒体名","url":"https://...","tier1":"眼镜"}]   // 选填，信源页补充主页链接
}
```
所有内容必须来自真实可访问的原文链接，不得编造。空数组会在页面显示空状态。

## 发布
```bash
/workspace/accessory-radar/publish.sh /path/to/2026-10-15.json
```
读取 JSON 的 `date` → 复制为 `data/<date>.json`（同日覆盖）→ `build.py` 校验并重建 `data/index.json`（校验失败则中止，不部署）→ `vercel deploy --prod` 到团队 team_ncYiY90vpW4c7wfGYO9Ae3If 的 `accessory-radar` 项目（依赖本机已登录的 Vercel CLI 凭据，通过 npx 调用）。

页面「品牌覆盖」区块会列出 config/brands.json 中每个 P0/P1 品牌当日是否有 brand_news；brand_news 与 brand_insights 的 brand 必须与 config/brands.json 的 name 完全一致（build.py 会校验）。

## 年度回溯数据 `data/2026-backfill.json`

```json
{ "year": 2026, "window": "2026-01-01..2026-10-14", "updated": "2026-10-14", "method": "检索方法说明",
  "items": [ { "date": "2026-07-28 或 2026-07", "month": "2026-07", "date_precision": "day|month",
     "kind": "industry|brand", "brand": "仅 kind=brand，须在 config/brands.json",
     "tier1": "箱包|眼镜|珠宝腕表|服配|玉石翡翠|综合", "segment": "奢侈品|轻奢|大众",
     "type": "财报|并购|资本|人事|新品|营销|市场|数据|政策|深度", "importance": 1,
     "title": "", "summary": "", "source": "", "url": "https://..." } ],
  "sector_reviews": [ { "tier1": "箱包", "title": "", "body": "", "refs": ["https://..."] } ] }
```
- 「2026 全年」页（`#/year`）合并本文件与所有日报中 2026 年的 industry_news / brand_news（按 url 去重）。
- 品牌库 `#/brands/<品牌>` 显示该品牌 2026 时间线。
- 只收录可核验日期的真实事件；仅能确认到月份时 `date_precision: "month"`。build.py 会校验本文件。
