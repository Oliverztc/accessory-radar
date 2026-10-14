#!/usr/bin/env python3
"""Validate data/*.json and generate data/index.json (list of dates, newest first)."""
import json, glob, os, re, sys
root = os.path.dirname(os.path.abspath(__file__))
TIERS = {"箱包","眼镜","珠宝腕表","服配","玉石翡翠","综合"}
STAGES = {"萌芽","上升","成熟"}
SEGS = {"奢侈品","轻奢","大众"}
errs, days = [], []
def _cfg(n):
    try: return json.load(open(os.path.join(root, "config", n), encoding="utf-8"))
    except Exception as e: print(f"config/{n} 读取失败: {e}"); sys.exit(1)
_b = _cfg("brands.json")
if not isinstance(_b, list): errs.append("config/brands.json 须为数组")
for i, b in enumerate(_b if isinstance(_b, list) else []):
    if not b.get("name"): errs.append(f"config/brands.json[{i}] 缺少 name")
    if b.get("watch_level") not in {"P0","P1","P2","P3"}: errs.append(f"config/brands.json[{i}] watch_level 非法: {b.get('watch_level')}")
    if b.get("tier1") not in TIERS | {"待确认"}: errs.append(f"config/brands.json[{i}] tier1 非法: {b.get('tier1')}")
    if not isinstance(b.get("aliases", []), list): errs.append(f"config/brands.json[{i}] aliases 须为数组")
BRANDS = {b.get("name") for b in _b} if isinstance(_b, list) else set()

_s = _cfg("sources.json")
for i, t in enumerate(_s.get("tiers", [])):
    if not t.get("tier") or not isinstance(t.get("sources"), list): errs.append(f"config/sources.json tiers[{i}] 须含 tier 与 sources")
    for j, x in enumerate(t.get("sources", [])):
        if not x.get("name"): errs.append(f"config/sources.json tiers[{i}].sources[{j}] 缺少 name")
        if x.get("url") and not re.match(r"^https?://", x["url"]): errs.append(f"config/sources.json tiers[{i}].sources[{j}] url 无效")
_site = _cfg("site.json")
for k in ("site_name", "sections", "palette", "fonts", "base_path"):
    if k not in _site: errs.append(f"config/site.json 缺少 {k}")
for k, v in _site.get("palette", {}).items():
    if not re.match(r"^#[0-9a-fA-F]{3,8}$", str(v)): errs.append(f"config/site.json palette.{k} 颜色非法: {v}")
for f in sorted(glob.glob(os.path.join(root, "data", "????-??-??.json"))):
    d = json.load(open(f, encoding="utf-8"))
    name = os.path.basename(f)[:-5]
    if d.get("date") != name: errs.append(f"{name}: date 字段与文件名不一致")
    for i, n in enumerate(d.get("industry_news", [])):
        for k in ("date","source","title","url","tier1","type","importance","summary"):
            if k not in n: errs.append(f"{name} industry_news[{i}] 缺少 {k}")
        if n.get("tier1") not in TIERS: errs.append(f"{name} industry_news[{i}] tier1 非法: {n.get('tier1')}")
        if not (isinstance(n.get("importance"), int) and 1 <= n["importance"] <= 5): errs.append(f"{name} industry_news[{i}] importance 须为 1-5 整数")
        if "segment" in n and n["segment"] not in SEGS: errs.append(f"{name} industry_news[{i}] segment 须为 奢侈品/轻奢/大众")
    for i, a in enumerate(d.get("brand_insights", [])):
        for k in ("brand","title","body","sources"):
            if not a.get(k): errs.append(f"{name} brand_insights[{i}] 缺少 {k}")
        if a.get("brand") not in BRANDS: errs.append(f"{name} brand_insights[{i}] brand 不在 config/brands.json: {a.get('brand')}")
        for r in a.get("sources", []):
            if not re.match(r"^https?://", r.get("url","")): errs.append(f"{name} brand_insights[{i}] source url 无效")
    for i, r in enumerate(d.get("reading_list", [])):
        for k in ("title","source","url"):
            if not r.get(k): errs.append(f"{name} reading_list[{i}] 缺少 {k}")
    for i, n in enumerate(d.get("brand_news", [])):
        if n.get("brand") not in BRANDS: errs.append(f"{name} brand_news[{i}] brand 不在 config/brands.json: {n.get('brand')}")
    for i, t in enumerate(d.get("trends", [])):
        if t.get("stage") not in STAGES: errs.append(f"{name} trends[{i}] stage 须为 萌芽/上升/成熟")
    for sec in ("industry_news","brand_news"):
        for i, n in enumerate(d.get(sec, [])):
            if not re.match(r"^https?://", n.get("url","")): errs.append(f"{name} {sec}[{i}] url 无效")
    days.append({"date": name, "headline": d.get("headline",""),
                 "counts": {k: len(d.get(k, [])) for k in ("industry_news","brand_news","insights","trends","brand_insights")}})
yf = os.path.join(root, "data", "2026-backfill.json")
if os.path.exists(yf):
    y = json.load(open(yf, encoding="utf-8")); TY = {"财报","并购","资本","人事","新品","营销","市场","数据","政策","深度"}
    for i, n in enumerate(y.get("items", [])):
        for k in ("date","month","kind","tier1","segment","type","importance","title","source","url"):
            if k not in n or n[k] in ("", None): errs.append(f"backfill items[{i}] 缺少 {k}")
        if not re.match(r"^2026-\d{2}(-\d{2})?$", str(n.get("date",""))) or str(n.get("date",""))[:7] != n.get("month"): errs.append(f"backfill items[{i}] date/month 非法")
        if n.get("date_precision","day") == "day" and len(str(n.get("date",""))) != 10: errs.append(f"backfill items[{i}] 日精度须为 YYYY-MM-DD")
        if n.get("tier1") not in TIERS: errs.append(f"backfill items[{i}] tier1 非法")
        if n.get("segment") not in SEGS: errs.append(f"backfill items[{i}] segment 非法")
        if n.get("type") not in TY: errs.append(f"backfill items[{i}] type 非法: {n.get('type')}")
        if not (isinstance(n.get("importance"), int) and 1 <= n["importance"] <= 5): errs.append(f"backfill items[{i}] importance 非法")
        if n.get("kind") == "brand" and n.get("brand") not in BRANDS: errs.append(f"backfill items[{i}] brand 不在 config/brands.json: {n.get('brand')}")
        if not re.match(r"^https?://", n.get("url","")): errs.append(f"backfill items[{i}] url 无效")
    for i, r in enumerate(y.get("sector_reviews", [])):
        if r.get("tier1") not in TIERS or not r.get("body"): errs.append(f"backfill sector_reviews[{i}] 非法")
        for u in r.get("refs", []):
            if not re.match(r"^https?://", u): errs.append(f"backfill sector_reviews[{i}] ref 无效")
if errs:
    print("\n".join(errs)); sys.exit(1)
days.sort(key=lambda x: x["date"], reverse=True)
json.dump(days, open(os.path.join(root, "data", "index.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"OK: {len(days)} day(s) indexed")
