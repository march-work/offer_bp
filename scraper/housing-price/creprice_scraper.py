#!/usr/bin/env python3
"""
creprice_scraper.py
从 creprice.cn 抓取中国 11 个主要城市的区县级房价/租金数据。

反检测措施：
  - playwright-stealth 隐身（移除 webdriver 标志、伪造指纹）
  - 随机化 User-Agent
  - 随机延迟 + 随机鼠标移动
  - 持久化 cookie（跨运行复用）
  - IP 被封时自动等待并重试

Usage:
    python creprice_scraper.py                    # 默认运行
    python creprice_scraper.py --city 南京         # 只跑一个城市
    python creprice_scraper.py --month 2026-02    # 指定月份
    python creprice_scraper.py --output out.json   # 自定义输出
"""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
import time
from datetime import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

# ── Configuration ──────────────────────────────────────────────────────────

CITIES = {
    '北京': 'bj',
    '上海': 'sh',
    '广州': 'gz',
    '深圳': 'sz',
    '南京': 'nj',
    '武汉': 'wh',
    '杭州': 'hz',
    '成都': 'cd',
    '西安': 'xa',
    '青岛': 'qd',
    '合肥': 'hf',
}

SEEDS = {
    'bj': 'xc',
    'sh': 'HP',
    'gz': 'th',
    'sz': 'NS',
    'nj': 'XW',
    'wh': 'WC',
    'hz': 'XH',
    'cd': 'WH',
    'xa': 'YL',
    'qd': 'SN',
    'hf': 'SG',
}

TRADES = [
    {'key': 'secondhand',  'param': None,          'label': '二手房'},
    {'key': 'newhome',     'param': 'newha',       'label': '新楼盘'},
    {'key': 'whole_rent',  'param': 'leasewhole',   'label': '整租'},
    {'key': 'shared_rent', 'param': 'leasejoin',    'label': '合租'},
]

BASE_URL = 'https://www.creprice.cn'
COOKIE_DIR = Path(__file__).parent / 'creprice_auth'

# 10 个真实 Chrome UA，随机轮换
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/131.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
]

# 页面间延迟范围（秒），随机取值
PAGE_DELAY_MIN = 8
PAGE_DELAY_MAX = 15

# 遇到频率限制时的冷却时间（秒）
COOLDOWN_SEC = 120


# ── Parsing ───────────────────────────────────────────────────────────────────

def parse_districts(html: str) -> list[tuple[str, str]]:
    """从页面 HTML 中提取区县列表。"""
    pattern = re.compile(
        r'href="/district/([A-Za-z0-9]+)\.html\?city=(\w+)"[^>]*>\s*<span>([^<]+)</span>'
    )
    seen = set()
    results = []
    for m in pattern.finditer(html):
        code, city = m.group(1), m.group(2)
        name = m.group(3).strip()
        if code not in seen:
            seen.add(code)
            results.append((code, name))
    return results


def extract_province(html: str, city_name: str) -> str | None:
    """从面包屑导航提取省份。"""
    pattern = re.compile(
        r'(?:>|&gt;)\s*<a[^>]*>([^<]*?)</a>\s*(?:>|&gt;)\s*<a[^>]*>' + re.escape(city_name) + r'</a>'
    )
    m = pattern.search(html)
    if m:
        province = m.group(1).strip()
        if province and province not in ('全国', ''):
            return province
    return None


def parse_overview(html: str) -> dict | None:
    """从页面 HTML 概况区域提取数据。"""
    gk_match = re.search(
        r'<div\s+class="[^"]*gk[^"]*"[^>]*>[\s\S]*?<div\s+class="data"[^>]*>([\s\S]*?)</div>',
        html, re.DOTALL,
    )
    if not gk_match:
        return None

    text = re.sub(r'<[^>]+>', ' ', gk_match.group(1))
    text = re.sub(r'\s+', ' ', text).strip()

    if not text or text == '--':
        return None

    result = {}

    # 单价
    m = re.search(r'([\d,]+(?:\.\d+)?)\s*(万元/㎡|元/㎡|元/月/㎡)', text)
    if m:
        try:
            result['unit_price'] = float(m.group(1).replace(',', ''))
        except ValueError:
            result['unit_price'] = None
        result['unit_price_display'] = f"{m.group(1)} {m.group(2)}"

    # 环比
    m = re.search(r'环比[：:]\s*([+-]?[\d.]+)\s*%', text)
    result['mom_change'] = f"{m.group(1)}%" if m else None

    # 单价区间
    m = re.search(r'单价区间[：:]\s*([\d,]+)\s*元/㎡\s*[-–—]\s*([\d,]+)\s*元', text)
    if m:
        result['price_range_min'] = int(m.group(1).replace(',', ''))
        result['price_range_max'] = int(m.group(2).replace(',', ''))

    # 总价（住房用万元，租房用元/月）
    m = re.search(r'平均总价[：:]\s*([\d,]+(?:\.\d+)?)\s*万元', text)
    if m:
        try:
            result['total_price'] = float(m.group(1).replace(',', ''))
        except ValueError:
            result['total_price'] = None
        result['total_price_display'] = f"{m.group(1)} 万元"
    else:
        m = re.search(r'平均总价[：:]\s*([\d,]+(?:\.\d+)?)\s*元/月', text)
        if m:
            try:
                result['total_price'] = float(m.group(1).replace(',', ''))
            except ValueError:
                result['total_price'] = None
            result['total_price_display'] = f"{m.group(1)} 元/月"

    # 售租比
    m = re.search(r'售租比[：:]\s*(\d+)', text)
    result['sell_rent_ratio'] = int(m.group(1)) if m else None

    if result.get('price_range_min') and result.get('price_range_max'):
        result['price_range_display'] = (
            f"{result['price_range_min']:,} - {result['price_range_max']:,} 元/㎡"
        )
    else:
        result['price_range_display'] = None

    return result


# ── Browser Stealth ────────────────────────────────────────────────────────

def stealth_init_script() -> str:
    """生成注入到浏览器的隐身脚本，在所有页面加载前执行。

    修复以下检测点:
      1. navigator.webdriver = false
      2. navigator.plugins 填充常见插件
      3. navigator.languages 填充
      4. chrome.runtime 填充
      5. WebGL vendor/renderer 伪造
      6. Permission API 伪装
      7. 隐藏自动化相关的 CDP 特征
    """
    return """
    // 1. navigator.webdriver — 最关键的检测点
    Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        configurable: true,
    });

    // 2. navigator.plugins — 填充 5 个常见插件
    Object.defineProperty(navigator, 'plugins', {
        get: () => {
            const plugins = [
                { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: '' },
                { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
                { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
                { name: 'PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: 'Portable Document Format' },
                { name: 'Google Docs', filename: 'gphnmmjpkdaiabgofmppepaimbnfahk', description: '' },
            ];
            plugins.length = 5;
            return Object.freeze(plugins);
        },
        configurable: true,
    });

    // 3. navigator.languages
    Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-CN', 'zh', 'en-US', 'en'],
        configurable: true,
    });

    // 4. chrome.runtime
    if (!window.chrome) {
        window.chrome = {};
    }
    if (!window.chrome.runtime) {
        window.chrome.runtime = {
            connect: function() {},
            sendMessage: function() {},
        };
    }

    // 5. WebGL 伪造
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // WebGL vendor
        if (parameter === 37445) return 'Google Inc. (NVIDIA)';
        // WebGL renderer
        if (parameter === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0_0_0)';
        return getParameter.call(this, parameter);
    };

    // 6. Permissions API
    const originalQuery = window.Permission.prototype.query;
    if (originalQuery) {
        window.Permission.prototype.query = function(permission) {
            return Promise.resolve({ state: 'granted', name: permission });
        };
    }

    // 7. 隐藏 CDP 特征
    // @ts-ignore
    const _Error = Error;
    Object.defineProperty(_Error, 'prepareStackTrace', { value: '' });

    // 8. 伪造 mediaDevices / screen
    Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => [4, 8, 12, 16][Math.floor(Math.random() * 4)],
        configurable: true,
    });

    // 9. prefers-color-scheme
    Object.defineProperty(window, 'matchMedia', {
        value: (query) => ({
            matches: false,
            media: query,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            dispatchEvent: () => {},
        }),
    });

    // 10. 隐藏自动化相关的 window 属性
    delete window.__playwright_evaluation_script__;
    """


def human_delay(min_s: float = 1.0, max_s: float = 3.0) -> float:
    """返回一个随机的人类化延迟时间。"""
    return min(max(random.uniform(min_s, max_s), min_s), max_s)


def human_mouse_move(page, selector: str | None = None) -> None:
    """模拟人类鼠标移动：在页面随机位置移动鼠标。"""
    viewport = page.viewport_size
    if viewport:
        x = random.randint(100, viewport['width'] - 100)
        y = random.randint(100, viewport['height'] - 100)
        page.mouse.move(x, y, steps=random.randint(5, 15))
        time.sleep(human_delay(0.1, 0.5))


# ── Navigation ─────────────────────────────────────────────────────────────

def navigate(page, url: str) -> str | None:
    """导航到 URL，处理 CAPTCHA 和频率限制。返回 HTML 或 None。"""
    try:
        page.goto(url, wait_until='domcontentloaded', timeout=30000)
    except PlaywrightTimeout:
        return None

    time.sleep(human_delay(2, 4))

    # 检查是否被重定向到验证码页
    current_url = page.url
    if 'authcode.creprice.cn' in current_url:
        print()
        print("=" * 55)
        print("  [验证码] 请在浏览器窗口中手动输入验证码！")
        print("  等待自动继续...")
        print("=" * 55)
        try:
            page.wait_for_url('**/creprice.cn/**', timeout=300_000)
            print("  [通过] 验证码已解决，重新导航...")
            time.sleep(1)
            page.goto(url, wait_until='domcontentloaded', timeout=30000)
            time.sleep(human_delay(2, 4))
            return page.content()
        except PlaywrightTimeout:
            print("  [超时] 验证码等待超时")
            return None

    # 检查频率限制
    title = page.title()
    if '抱歉' in title or '频繁' in title:
        print(f"  [频率限制] 等待 {COOLDOWN_SEC} 秒...")
        time.sleep(COOLDOWN_SEC)
        try:
            page.goto(url, wait_until='domcontentloaded', timeout=30000)
            time.sleep(human_delay(2, 4))
            return page.content()
        except PlaywrightTimeout:
            return None

    # 模拟人类行为：随机滚动页面
    try:
        scroll_px = random.randint(200, 600)
        page.evaluate(f'window.scrollTo(0, {scroll_px})')
        time.sleep(human_delay(0.3, 1.0))
    except Exception:
        pass

    return page.content()


# ── Main Scraper ──────────────────────────────────────────────────────────

def scrape_city(city_name: str, city_code: str, context, data_month: str) -> dict:
    """抓取一个城市的所有区县数据。"""
    seed_code = SEEDS.get(city_code)
    if not seed_code:
        print(f"  [SKIP] {city_name}: 无种子区")
        return {}

    # Phase 1: 发现区县
    seed_url = f"{BASE_URL}/district/{seed_code}.html?city={city_code}"
    print(f"  发现区县中...")

    html = navigate(context.new_page(), seed_url)
    if not html:
        print(f"  [FAIL] {city_name}: 无法加载种子页")
        return {}

    province = extract_province(html, city_name)
    districts = parse_districts(html)

    if not districts:
        print(f"  [SKIP] {city_name}: 未发现区县")
        return {}

    print(f"  {len(districts)} 个区 (省: {province or '?'})")

    # Phase 2: 逐区逐类型抓取
    city_data = {'province': province, 'districts': {}}

    for dist_code, dist_name in districts:
        entry = {}
        for trade in TRADES:
            url = f"{BASE_URL}/district/{dist_code}.html?city={city_code}"
            if trade['param']:
                url += f"&type={trade['param']}"

            html = navigate(context.new_page(), url)
            entry[trade['key']] = parse_overview(html) if html else None

            # 页面间随机延迟
            time.sleep(human_delay(PAGE_DELAY_MIN, PAGE_DELAY_MAX))

        city_data['districts'][dist_name] = entry

    return city_data


def main():
    parser = argparse.ArgumentParser(description='Creprice 隐身爬虫')
    parser.add_argument('--month', type=str, default=None, help='目标月份 YYYY-MM')
    parser.add_argument('--headless', action='store_true', help='无头模式')
    parser.add_argument('--output', type=str, default='housing_prices.json', help='输出 JSON 路径')
    parser.add_argument('--city', type=str, default=None, help='只爬指定城市')

    args = parser.parse_args()

    # 月份
    if args.month:
        try:
            dt = datetime.strptime(args.month, '%Y-%m')
        except ValueError:
            print("月份格式错误，使用 YYYY-MM")
            sys.exit(1)
    else:
        dt = datetime.now()
    data_month = dt.strftime('%Y-%m')

    # 城市过滤
    cities = CITIES
    if args.city:
        if args.city in cities:
            cities = {args.city: cities[args.city]}
        else:
            print(f"未知城市: {args.city}")
            print(f"可选: {', '.join(CITIES.keys())}")
            sys.exit(1)

    print(f"Creprice 隐身爬虫 v2")
    print(f"  月份: {data_month}")
    print(f"  城市: {', '.join(cities.keys())}")
    print(f"  延迟: {PAGE_DELAY_MIN}-{PAGE_DELAY_MAX}s/页")
    print(f"  输出: {args.output}")
    print(f"  模式: {'无头' if args.headless else '有头(推荐)'}")
    print()

    COOKIE_DIR.mkdir(exist_ok=True)
    start = time.time()
    cities_result = {}

    with sync_playwright() as p:
        # 使用 persistent context 保存 cookies（跨运行复用）
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(COOKIE_DIR),
            headless=args.headless,
            locale='zh-CN',
            viewport={'width': 1920, 'height': 1080},
            args=['--disable-blink-features=AutomationControlled'],
            user_agent=random.choice(USER_AGENTS),
        )

        # 注入隐身脚本（在所有新页面加载前执行）
        context.add_init_script(stealth_init_script())

        for city_name, city_code in cities.items():
            print(f"[{city_name}] ({city_code})")
            result = scrape_city(city_name, city_code, context, data_month)
            if result:
                cities_result[city_name] = result

    elapsed = time.time() - start
    print()

    # 统计
    total_dist = sum(len(c.get('districts', {})) for c in cities_result.values())
    filled = sum(
        1 for c in cities_result.values()
        for d in c.get('districts', {}).values()
        for v in d.values() if v is not None
    )
    total = total_dist * 4

    print(f"  耗时: {elapsed:.0f}s")
    print(f"  区县: {total_dist}")
    print(f"  数据: {filled}/{total} ({100 * filled // max(total, 1)}%)")

    output = {
        'update_time': data_month,
        'data_month': data_month,
        'source': 'creprice.cn',
        'cities': cities_result,
    }

    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"  输出: {args.output}")


if __name__ == '__main__':
    main()
