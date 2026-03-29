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
  - 断点续爬：已爬取的数据自动保存到 data/info/，重启后跳过

Usage:
    python creprice_scraper.py                    # 默认运行（支持断点续爬）
    python creprice_scraper.py --city 南京         # 只跑一个城市
    python creprice_scraper.py --month 2026-02    # 指定月份
    python creprice_scraper.py --output out.json   # 自定义输出
    python creprice_scraper.py --reset             # 清除断点，重新开始
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
DATA_DIR = Path(__file__).parent / 'data' / 'info'

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

# 验证码最大处理轮次
MAX_CAPTCHA_ROUNDS = 5


# ── ANSI Color Helpers ────────────────────────────────────────────────────

C_RESET = '\033[0m'
C_BOLD  = '\033[1m'
C_DIM   = '\033[2m'
C_RED   = '\033[91m'
C_GREEN = '\033[92m'
C_YELLOW = '\033[93m'
C_BLUE  = '\033[94m'
C_CYAN  = '\033[96m'
C_WHITE = '\033[97m'


def log(msg: str, color: str = C_RESET) -> None:
    """打印带时间戳的彩色日志。"""
    ts = datetime.now().strftime('%H:%M:%S')
    print(f"{C_DIM}{ts}{C_RESET} {color}{msg}{C_RESET}", flush=True)


def log_ok(msg: str) -> None:
    log(f"  ✓ {msg}", C_GREEN)


def log_fail(msg: str) -> None:
    log(f"  ✗ {msg}", C_RED)


def log_warn(msg: str) -> None:
    log(f"  ⚠ {msg}", C_YELLOW)


def log_info(msg: str) -> None:
    log(f"  → {msg}", C_CYAN)


def log_divider(char: str = '─', width: int = 60) -> None:
    print(f"{C_DIM}{char * width}{C_RESET}", flush=True)


def log_banner(title: str) -> None:
    log_divider('═')
    log(f"  {C_BOLD}{title}{C_RESET}")
    log_divider('═')


# ── Checkpoint / Resume ────────────────────────────────────────────────────

def _checkpoint_path(data_month: str) -> Path:
    return DATA_DIR / f'checkpoint_{data_month}.json'


def _result_path(data_month: str) -> Path:
    return DATA_DIR / f'result_{data_month}.json'


def load_checkpoint(data_month: str) -> tuple[dict, dict]:
    """加载断点文件和已有结果。

    Returns:
        (checkpoint_dict, results_dict)
        checkpoint_dict 结构: {'completed': {'城市': {'区县': ['trade1', ...]}}}
        results_dict 结构:   {'城市': {'province': ..., 'districts': {...}}}
    """
    cp_path = _checkpoint_path(data_month)
    res_path = _result_path(data_month)

    checkpoint: dict = {'completed': {}}
    results: dict = {}

    if cp_path.exists():
        try:
            checkpoint = json.loads(cp_path.read_text(encoding='utf-8'))
            log_info(f"加载断点: {cp_path.name}")
        except (json.JSONDecodeError, OSError) as e:
            log_warn(f"断点文件损坏，忽略: {e}")

    if res_path.exists():
        try:
            results = json.loads(res_path.read_text(encoding='utf-8'))
            city_count = len(results)
            dist_count = sum(len(c.get('districts', {})) for c in results.values())
            log_info(f"加载已有数据: {city_count} 城市, {dist_count} 区县")
        except (json.JSONDecodeError, OSError) as e:
            log_warn(f"结果文件损坏，忽略: {e}")

    return checkpoint, results


def save_checkpoint(data_month: str, checkpoint: dict, results: dict) -> None:
    """保存断点和中间结果到 data/info/。"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    cp_path = _checkpoint_path(data_month)
    res_path = _result_path(data_month)

    try:
        cp_path.write_text(
            json.dumps(checkpoint, ensure_ascii=False, indent=2), encoding='utf-8'
        )
        res_path.write_text(
            json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8'
        )
    except OSError as e:
        log_warn(f"保存断点失败: {e}")


def is_completed(checkpoint: dict, city: str, district: str, trade_key: str) -> bool:
    """检查某条记录是否已爬取完成。"""
    return (
        trade_key
        in checkpoint.get('completed', {})
        .get(city, {})
        .get(district, [])
    )


def mark_completed(checkpoint: dict, city: str, district: str, trade_key: str) -> None:
    """标记一条记录为已完成。"""
    if city not in checkpoint['completed']:
        checkpoint['completed'][city] = {}
    if district not in checkpoint['completed'][city]:
        checkpoint['completed'][city][district] = []
    if trade_key not in checkpoint['completed'][city][district]:
        checkpoint['completed'][city][district].append(trade_key)


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

def _handle_captcha(page, url: str, round_num: int) -> str | None:
    """处理单轮验证码。返回 HTML 或 None。"""
    log_warn(f"验证码第 {C_BOLD}{round_num}/{MAX_CAPTCHA_ROUNDS}{C_YELLOW} 轮 "
             f"— 请在浏览器中完成验证码输入！")
    print()
    input(f"  {C_CYAN}>>> 完成验证码后按 Enter 继续 <<<{C_RESET}")
    print()

    # 检查是否已回到主站
    current_url = page.url
    if 'authcode.creprice.cn' not in current_url:
        log_ok(f"验证码通过 (第 {round_num} 轮)")
        time.sleep(1)
        page.goto(url, wait_until='domcontentloaded', timeout=30000)
        time.sleep(human_delay(2, 4))
        # 再次检查 — 可能在新导航中又触发验证码
        if 'authcode.creprice.cn' in page.url:
            return None  # 需要下一轮
        return page.content()

    # 还在验证码页 — 可能用户没完成，或者需要再来一轮
    log_warn("仍在验证码页面，可能需要再输一轮")
    return None


def navigate(page, url: str) -> str | None:
    """导航到 URL，处理验证码和频率限制。返回 HTML 或 None。"""
    try:
        page.goto(url, wait_until='domcontentloaded', timeout=30000)
    except PlaywrightTimeout:
        return None

    time.sleep(human_delay(2, 4))

    # ── 验证码处理（多轮循环） ──
    captcha_round = 0
    while 'authcode.creprice.cn' in page.url:
        captcha_round += 1
        if captcha_round > MAX_CAPTCHA_ROUNDS:
            log_fail(f"验证码已连续 {MAX_CAPTCHA_ROUNDS} 轮未通过，跳过此页")
            return None

        log_banner(f"[验证码] 第 {captcha_round}/{MAX_CAPTCHA_ROUNDS} 轮")
        result = _handle_captcha(page, url, captcha_round)
        if result is not None:
            return result
        # result is None → 仍在验证码页，继续循环

    # ── 频率限制检查 ──
    title = page.title()
    if '抱歉' in title or '频繁' in title:
        log_warn(f"触发频率限制，等待 {COOLDOWN_SEC}s 冷却...")
        time.sleep(COOLDOWN_SEC)
        try:
            page.goto(url, wait_until='domcontentloaded', timeout=30000)
            time.sleep(human_delay(2, 4))
            # 验证码可能在冷却后也出现
            if 'authcode.creprice.cn' in page.url:
                return navigate(page, url)  # 递归处理
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

def scrape_city(
    city_name: str,
    city_code: str,
    context,
    data_month: str,
    checkpoint: dict,
    all_results: dict,
) -> dict:
    """抓取一个城市的所有区县数据，支持断点续爬。"""
    seed_code = SEEDS.get(city_code)
    if not seed_code:
        log_fail(f"{city_name}: 无种子区，跳过")
        return all_results.get(city_name, {})

    # 检查该城市是否已全部完成
    city_cp = checkpoint.get('completed', {}).get(city_name, {})

    # Phase 1: 发现区县
    seed_url = f"{BASE_URL}/district/{seed_code}.html?city={city_code}"
    log_info("发现区县中...")

    html = navigate(context.new_page(), seed_url)
    if not html:
        log_fail(f"{city_name}: 无法加载种子页")
        return all_results.get(city_name, {})

    province = extract_province(html, city_name)
    districts = parse_districts(html)

    if not districts:
        log_fail(f"{city_name}: 未发现区县")
        return all_results.get(city_name, {})

    log_info(f"发现 {C_BOLD}{len(districts)}{C_RESET} 个区 (省: {province or '?'})")

    # 恢复已有数据或初始化
    city_data = all_results.get(city_name, {'province': province, 'districts': {}})
    city_data['province'] = province  # 确保省份信息最新

    # Phase 2: 逐区逐类型抓取
    total_tasks = len(districts) * len(TRADES)
    done_tasks = 0
    skipped_tasks = 0
    start_time = time.time()

    for dist_idx, (dist_code, dist_name) in enumerate(districts, 1):
        # 计算已完成数
        completed_in_dist = sum(
            1 for t in TRADES
            if is_completed(checkpoint, city_name, dist_name, t['key'])
        )
        done_tasks += completed_in_dist
        skipped_tasks += completed_in_dist

        entry = city_data['districts'].get(dist_name, {})

        # 跳过已全部完成的区县
        if completed_in_dist == len(TRADES):
            print(
                f"  {C_DIM}[{dist_idx}/{len(districts)}] "
                f"{dist_name} — 已完成，跳过{C_RESET}",
                flush=True,
            )
            continue

        print(
            f"  [{C_CYAN}{dist_idx}/{len(districts)}{C_RESET}] "
            f"{C_BOLD}{dist_name}{C_RESET}",
            flush=True,
        )

        for trade in TRADES:
            # 断点跳过
            if is_completed(checkpoint, city_name, dist_name, trade['key']):
                print(
                    f"    {C_DIM}├─ {trade['label']:　<6} 跳过（已有数据）{C_RESET}",
                    flush=True,
                )
                continue

            url = f"{BASE_URL}/district/{dist_code}.html?city={city_code}"
            if trade['param']:
                url += f"&type={trade['param']}"

            html = navigate(context.new_page(), url)
            parsed = parse_overview(html) if html else None
            entry[trade['key']] = parsed

            if parsed:
                log_ok(f"{dist_name} → {trade['label']}: "
                       f"{parsed.get('unit_price_display', 'N/A')}")
                mark_completed(checkpoint, city_name, dist_name, trade['key'])
                done_tasks += 1
            else:
                log_fail(f"{dist_name} → {trade['label']}: 无数据")
                done_tasks += 1

            # 每完成一个 trade 就保存断点
            save_checkpoint(data_month, checkpoint, all_results)

            # 页面间随机延迟
            delay = human_delay(PAGE_DELAY_MIN, PAGE_DELAY_MAX)
            elapsed = time.time() - start_time
            remaining_tasks = total_tasks - done_tasks
            if remaining_tasks > 0:
                avg_per_task = elapsed / max(done_tasks, 1)
                eta_sec = avg_per_task * remaining_tasks
                eta_min = int(eta_sec // 60)
                eta_sec_rem = int(eta_sec % 60)
                log_info(
                    f"延迟 {delay:.0f}s | "
                    f"进度 {done_tasks}/{total_tasks} | "
                    f"预计剩余 {eta_min}m{eta_sec_rem:02d}s"
                )
            else:
                log_info(f"延迟 {delay:.0f}s | 进度 {done_tasks}/{total_tasks}")

            time.sleep(delay)

        city_data['districts'][dist_name] = entry

    all_results[city_name] = city_data

    # 最终保存
    save_checkpoint(data_month, checkpoint, all_results)

    elapsed = time.time() - start_time
    if skipped_tasks > 0:
        log_ok(
            f"{city_name} 完成 | "
            f"{done_tasks - skipped_tasks} 新爬取, {skipped_tasks} 跳过 | "
            f"耗时 {elapsed:.0f}s"
        )
    else:
        log_ok(f"{city_name} 完成 | 耗时 {elapsed:.0f}s")

    return city_data


def main():
    parser = argparse.ArgumentParser(description='Creprice 隐身爬虫（支持断点续爬）')
    parser.add_argument('--month', type=str, default=None, help='目标月份 YYYY-MM')
    parser.add_argument('--headless', action='store_true', help='无头模式')
    parser.add_argument('--output', type=str, default='housing_prices.json', help='输出 JSON 路径')
    parser.add_argument('--city', type=str, default=None, help='只爬指定城市')
    parser.add_argument('--reset', action='store_true', help='清除断点，从头开始')

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

    # 断点：重置模式
    if args.reset:
        cp_path = _checkpoint_path(data_month)
        res_path = _result_path(data_month)
        for p in (cp_path, res_path):
            if p.exists():
                p.unlink()
        log_info("已清除断点文件")

    # ── Banner ──
    print()
    log_banner(f"Creprice 隐身爬虫 v3 — 断点续爬")
    log_info(f"月份: {C_BOLD}{data_month}{C_RESET}")
    log_info(f"城市: {C_BOLD}{', '.join(cities.keys())}{C_RESET}")
    log_info(f"延迟: {PAGE_DELAY_MIN}-{PAGE_DELAY_MAX}s/页")
    log_info(f"输出: {args.output}")
    log_info(f"数据: {DATA_DIR}")
    log_info(f"模式: {'无头' if args.headless else '有头(推荐)'}")
    print()

    # 加载断点
    checkpoint, cities_result = load_checkpoint(data_month)

    COOKIE_DIR.mkdir(exist_ok=True)
    start = time.time()
    city_idx = 0
    total_cities = len(cities)

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
            city_idx += 1
            log_divider('─')
            log(
                f"  [{C_BOLD}{city_idx}/{total_cities}{C_RESET}] "
                f"{C_BOLD}{city_name}{C_RESET} ({city_code})",
                C_WHITE,
            )
            log_divider('─')

            result = scrape_city(
                city_name, city_code, context,
                data_month, checkpoint, cities_result,
            )
            if result:
                cities_result[city_name] = result

    elapsed = time.time() - start
    print()
    log_divider('═')

    # 统计
    total_dist = sum(len(c.get('districts', {})) for c in cities_result.values())
    filled = sum(
        1 for c in cities_result.values()
        for d in c.get('districts', {}).values()
        for v in d.values() if v is not None
    )
    total = total_dist * 4

    log(f"  {C_BOLD}抓取完成{C_RESET}")
    log_info(f"总耗时: {elapsed / 60:.1f} 分钟")
    log_info(f"城市: {len(cities_result)}/{total_cities}")
    log_info(f"区县: {total_dist}")
    log_info(f"有效数据: {C_BOLD}{filled}/{total}{C_RESET} ({100 * filled // max(total, 1)}%)")

    output = {
        'update_time': data_month,
        'data_month': data_month,
        'source': 'creprice.cn',
        'cities': cities_result,
    }

    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    log_info(f"最终输出: {C_BOLD}{args.output}{C_RESET}")
    log_info(f"断点数据: {C_BOLD}{DATA_DIR}{C_RESET}")
    print()


if __name__ == '__main__':
    main()
