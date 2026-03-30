#!/usr/bin/env python3
"""
creprice_scraper.py
从 creprice.cn 抓取中国 11 个主要城市的区县级房价/租金数据。

反检测措施：
  - navigator.webdriver / plugins / languages / chrome.runtime 伪装
  - Canvas 指纹噪声注入（每次指纹不同）
  - WebGL vendor/renderer 伪造（WebGL + WebGL2）
  - WebRTC IP 泄露防护（SDP 候选剥离）
  - Screen 属性与视口一致性伪装
  - Device Memory / Network Connection API 伪造
  - Permission API / matchMedia 伪装
  - CDP / Playwright 自动化特征清除
  - iframe 注入隔离（子 frame 也隐藏 webdriver）
  - 随机 User-Agent（每城市轮换）
  - 随机视口分辨率（每城市轮换）
  - 贝塞尔曲线鼠标轨迹 + 多段随机滚动
  - 持久化 cookie（跨运行复用）
  - IP 被封时自动冷却并重试
  - 断点续爬：已爬取数据自动保存到 data/info/，重启后跳过
  - 代理支持：自动从快代理发现可用 IP，验证后使用；失效自动切换
  - 断点续爬：已爬取数据自动保存到 data/info/，重启后跳过

Usage:
    python creprice_scraper.py                        # 自动发现代理 + 断点续爬
    python creprice_scraper.py --city 南京             # 只跑一个城市
    python creprice_scraper.py --month 2026-02        # 指定月份
    python creprice_scraper.py --output out.json       # 自定义输出
    python creprice_scraper.py --reset                 # 清除断点，重新开始
    python creprice_scraper.py --proxy http://IP:PORT  # 手动指定代理（失效后仍自动切换）
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from contextlib import contextmanager
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

# 9 个真实桌面 UA，每城市随机轮换
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

# 常见桌面分辨率，每城市随机选取
VIEWPORTS = [
    {'width': 1920, 'height': 1080},
    {'width': 1366, 'height': 768},
    {'width': 1536, 'height': 864},
    {'width': 1440, 'height': 900},
    {'width': 1280, 'height': 720},
    {'width': 1600, 'height': 900},
    {'width': 1680, 'height': 1050},
    {'width': 2560, 'height': 1440},
]

# 页面间延迟范围（秒），随机取值
PAGE_DELAY_MIN = 1.5
PAGE_DELAY_MAX = 5

# 遇到频率限制时的冷却时间（秒）
COOLDOWN_SEC = 120

# 验证码最大处理轮次
MAX_CAPTCHA_ROUNDS = 5

# 导航最大重试次数（防止无限循环）
MAX_NAV_DEPTH = 5

# 数据合理性校验阈值
MAX_REASONABLE_UNIT_PRICE = 1_000_000   # 100 万元/㎡ 上限
MAX_REASONABLE_TOTAL_PRICE = 100_000     # 100,000 万元（住房总价上限）
MAX_REASONABLE_RENT_PRICE = 1_000_000   # 1,000,000 元/月（租金上限）

# 断点保存间隔：每完成多少条新 trade 保存一次（默认 1 = 每条都保存）
# 设为更大值（如 4 = 每区保存一次）可减少磁盘 I/O
CHECKPOINT_SAVE_INTERVAL = 1

# 代理提醒间隔（秒）
PROXY_REMIND_INTERVAL = 15 * 60  # 15 分钟

# 免费代理网站
PROXY_SOURCE_URL = 'https://www.kuaidaili.com/free/'


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


def log_proxy_reminder(proxy: str | None) -> None:
    """打印代理更新提醒，带有醒目标识。"""
    log_divider('*')
    log_warn("代理已使用约 15 分钟，免费代理可能即将过期！")
    log_info(f"代理源: {C_BOLD}{PROXY_SOURCE_URL}{C_RESET}")
    if proxy:
        log_info(f"当前代理: {C_BOLD}{proxy}{C_RESET}")
    log_info(f"代理失效后会自动切换，无需手动操作")
    log_divider('*')


# ── Proxy Failed Signal ─────────────────────────────────────────────────────

class ProxyFailedError(Exception):
    """代理连接失败时抛出，触发主循环自动换代理重试当前城市。"""
    pass


# ── Proxy Fetch / Verify ────────────────────────────────────────────────────

def fetch_free_proxies(timeout: int = 10) -> list[str]:
    """从快代理免费页面抓取代理 IP 列表。

    使用 urllib 直接请求（不需要代理即可访问快代理），
    解析表格提取 IP:PORT，返回 http://IP:PORT 格式列表。
    """
    log_info(f"正在从 {C_BOLD}{PROXY_SOURCE_URL}{C_RESET} 获取免费代理...")
    proxies: list[str] = []
    try:
        req = urllib.request.Request(
            PROXY_SOURCE_URL,
            headers={'User-Agent': random.choice(USER_AGENTS)},
        )
        resp = urllib.request.urlopen(req, timeout=timeout)
        html = resp.read().decode('utf-8', errors='ignore')

        # 提取每行中的 IP 和 PORT
        # 快代理 HTML 格式: <td data-title="IP">x.x.x.x</td> <td data-title="PORT">1234</td>
        ip_pattern = re.compile(
            r'(?:data-title="IP"[^>]*>|<td>)\s*(\d+\.\d+\.\d+\.\d+)\s*</td>'
            r'.*?'
            r'(?:data-title="PORT"[^>]*>|<td>)\s*(\d+)\s*</td>',
            re.DOTALL,
        )
        for m in ip_pattern.finditer(html):
            ip, port = m.group(1), m.group(2)
            proxies.append(f"http://{ip}:{port}")

        log_ok(f"获取到 {len(proxies)} 个代理 IP")
    except Exception as e:
        log_fail(f"获取代理列表失败: {e}")

    return proxies


def quick_verify_proxy(proxy_url: str, timeout: int = 15) -> bool:
    """快速验证代理是否可以正常访问 creprice.cn（无验证码/频率限制）。

    使用 urllib 轻量 HTTP 请求，避免启动浏览器。
    """
    try:
        proxy_handler = urllib.request.ProxyHandler({
            'http': proxy_url,
            'https': proxy_url,
        })
        opener = urllib.request.build_opener(proxy_handler)
        req = urllib.request.Request(
            BASE_URL,
            headers={'User-Agent': random.choice(USER_AGENTS)},
        )
        resp = opener.open(req, timeout=timeout)
        html = resp.read().decode('utf-8', errors='ignore')

        # 被重定向到验证码页面
        if 'authcode' in html or '验证码' in html:
            return False
        # 触发频率限制
        if '抱歉' in html and '频繁' in html:
            return False
        # 正常页面应包含关键词
        if resp.status == 200 and len(html) > 2000:
            return True
        return False
    except Exception:
        return False


# ── Proxy Manager ───────────────────────────────────────────────────────────

class ProxyManager:
    """代理管理器：自动获取、验证、轮换代理 + 15 分钟过期提醒。"""

    # 每个城市最多因代理重试几次
    MAX_PROXY_RETRIES = 3

    def __init__(self, initial_proxy: str | None = None):
        self._current: str | None = initial_proxy
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    # ── 公开接口 ──

    def get_proxy(self) -> str | None:
        """返回当前可用代理。如果当前代理为空，自动发现一个。"""
        if self._current:
            return self._current
        return self._discover()

    def mark_failed(self):
        """标记当前代理失效，下次 get_proxy() 会自动换新。"""
        if self._current:
            log_fail(f"代理已失效: {self._current}")
        self._current = None

    def start_reminder(self):
        """启动 15 分钟过期提醒后台线程。"""
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._reminder_loop, daemon=True)
        self._thread.start()

    def stop_reminder(self):
        """停止提醒线程。"""
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=2)

    # ── 内部方法 ──

    def _discover(self) -> str | None:
        """从快代理获取并逐个验证，返回第一个可用的代理。"""
        proxies = fetch_free_proxies()
        if not proxies:
            log_warn("未获取到任何代理，尝试直连")
            return None

        log_info(f"开始逐个验证 {len(proxies)} 个代理（可访问 creprice.cn 且无验证码）...")
        for i, proxy in enumerate(proxies, 1):
            log_info(f"  测试 {i}/{len(proxies)}: {proxy}")
            if quick_verify_proxy(proxy):
                self._current = proxy
                log_ok(f"  可用: {proxy}")
                return proxy
            # 每 10 个打印一次进度
            if i % 10 == 0 and i < len(proxies):
                log_info(f"  已测试 {i}/{len(proxies)}，继续...")

        log_warn("所有代理均不可用，尝试直连")
        return None

    def _reminder_loop(self) -> None:
        while not self._stop_event.wait(timeout=PROXY_REMIND_INTERVAL):
            log_proxy_reminder(self._current)


# ── Checkpoint / Resume ────────────────────────────────────────────────────

def _checkpoint_path(data_month: str) -> Path:
    return DATA_DIR / f'checkpoint_{data_month}.json'


def _result_path(data_month: str) -> Path:
    return DATA_DIR / f'result_{data_month}.json'


def _city_result_path(data_month: str, city_name: str) -> Path:
    """单个城市结果文件路径。"""
    return DATA_DIR / f'result_{data_month}_{city_name}.json'


def _build_target_format(city_name: str, city_data: dict, data_month: str) -> dict:
    """将单个城市数据整理成目标格式。"""
    return {
        'update_time': datetime.now().isoformat(),
        'data_month': data_month,
        'source': 'creprice.cn',
        'city': city_name,
        'city_data': city_data,
    }


def load_checkpoint(data_month: str) -> tuple[dict, dict]:
    """加载断点文件和已有结果（优先合并单个城市结果。

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

    # 优先加载单个城市结果，如不存在则加载合并结果
    loaded_from_single = False
    for city_name in CITIES:
        city_res_path = _city_result_path(data_month, city_name)
        if city_res_path.exists():
            try:
                city_full = json.loads(city_res_path.read_text(encoding='utf-8'))
                if 'city_data' in city_full:
                    results[city_name] = city_full['city_data']
                    loaded_from_single = True
            except (json.JSONDecodeError, OSError) as e:
                log_warn(f"城市 {city_name} 结果文件损坏，忽略: {e}")

    if not loaded_from_single and res_path.exists():
        try:
            results = json.loads(res_path.read_text(encoding='utf-8'))
            city_count = len(results)
            dist_count = sum(len(c.get('districts', {})) for c in results.values())
            log_info(f"加载已有数据: {city_count} 城市, {dist_count} 区县")
        except (json.JSONDecodeError, OSError) as e:
            log_warn(f"合并结果文件损坏，忽略: {e}")

    return checkpoint, results


def save_checkpoint(data_month: str, checkpoint: dict, results: dict, city_name: str | None = None) -> None:
    """保存断点、合并结果，如指定城市，同时保存该城市的单独结果。"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    cp_path = _checkpoint_path(data_month)
    res_path = _result_path(data_month)

    try:
        # 保存断点
        cp_path.write_text(
            json.dumps(checkpoint, ensure_ascii=False, indent=2), encoding='utf-8'
        )
        # 保存合并结果
        res_path.write_text(
            json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8'
        )
        # 如指定城市，同时保存单独结果（目标格式）
        if city_name and city_name in results:
            city_res_path = _city_result_path(data_month, city_name)
            target_format = _build_target_format(city_name, results[city_name], data_month)
            city_res_path.write_text(
                json.dumps(target_format, ensure_ascii=False, indent=2), encoding='utf-8'
            )
            log_info(f"保存城市 {city_name} 单独结果: {city_res_path.name}")
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
    """从页面 HTML 概况区域提取数据，包含合理性校验。"""
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
            unit_price = float(m.group(1).replace(',', ''))
            if 0 < unit_price <= MAX_REASONABLE_UNIT_PRICE:
                result['unit_price'] = unit_price
            else:
                log_warn(f"单价异常: {unit_price}，标记为无效")
                result['unit_price'] = None
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
            total_price = float(m.group(1).replace(',', ''))
            if 0 < total_price <= MAX_REASONABLE_TOTAL_PRICE:
                result['total_price'] = total_price
            else:
                log_warn(f"总价异常: {total_price} 万元，标记为无效")
                result['total_price'] = None
        except ValueError:
            result['total_price'] = None
        result['total_price_display'] = f"{m.group(1)} 万元"
    else:
        m = re.search(r'平均总价[：:]\s*([\d,]+(?:\.\d+)?)\s*元/月', text)
        if m:
            try:
                total_price = float(m.group(1).replace(',', ''))
                if 0 < total_price <= MAX_REASONABLE_RENT_PRICE:
                    result['total_price'] = total_price
                else:
                    log_warn(f"月租金异常: {total_price} 元/月，标记为无效")
                    result['total_price'] = None
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
      1.  navigator.webdriver = false
      2.  navigator.plugins 填充常见插件
      3.  navigator.languages 填充
      4.  chrome.runtime 填充
      5.  WebGL / WebGL2 vendor/renderer 伪造
      6.  Canvas 指纹噪声注入
      7.  WebRTC IP 泄露防护（SDP 候选剥离）
      8.  Screen 属性与视口一致性
      9.  hardwareConcurrency 随机
      10. Device Memory 伪造
      11. Network Connection API 伪造
      12. Permission API 伪装
      13. matchMedia 伪装
      14. CDP / Playwright 标记清除
      15. iframe 注入隔离
    """
    return """
    /* ── 1. navigator.webdriver — 最关键的检测点 ── */
    Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        configurable: true,
    });

    /* ── 2. navigator.plugins — 填充常见插件 ── */
    Object.defineProperty(navigator, 'plugins', {
        get: () => {
            var plugins = [
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

    /* ── 3. navigator.languages ── */
    Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-CN', 'zh', 'en-US', 'en'],
        configurable: true,
    });

    /* ── 4. chrome.runtime ── */
    if (!window.chrome) { window.chrome = {}; }
    if (!window.chrome.runtime) {
        window.chrome.runtime = {
            connect: function() {},
            sendMessage: function() {},
        };
    }

    /* ── 5. WebGL / WebGL2 vendor/renderer 伪造 ── */
    var UNMASKED_VENDOR_WEBGL = 37445;
    var UNMASKED_RENDERER_WEBGL = 37446;

    var getParamWebGL1 = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {
        if (param === UNMASKED_VENDOR_WEBGL) return 'Google Inc. (NVIDIA)';
        if (param === UNMASKED_RENDERER_WEBGL) return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)';
        return getParamWebGL1.call(this, param);
    };

    if (typeof WebGL2RenderingContext !== 'undefined') {
        var getParamWebGL2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function(param) {
            if (param === UNMASKED_VENDOR_WEBGL) return 'Google Inc. (NVIDIA)';
            if (param === UNMASKED_RENDERER_WEBGL) return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)';
            return getParamWebGL2.call(this, param);
        };
    }

    /* ── 6. Canvas 指纹噪声 — 每次 toDataURL/toBlob 注入微小差异 ── */
    (function() {
        function injectNoise(canvas) {
            try {
                var ctx = canvas.getContext('2d');
                if (ctx) {
                    var prev = ctx.fillStyle;
                    ctx.fillStyle = 'rgba(1,1,1,0.008)';
                    ctx.fillRect(0, 0, 1, 1);
                    ctx.fillStyle = prev;
                }
            } catch(e) {}
        }

        var origToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function() {
            injectNoise(this);
            return origToDataURL.apply(this, arguments);
        };

        if (HTMLCanvasElement.prototype.toBlob) {
            var origToBlob = HTMLCanvasElement.prototype.toBlob;
            HTMLCanvasElement.prototype.toBlob = function() {
                injectNoise(this);
                return origToBlob.apply(this, arguments);
            };
        }

        // 同时干扰 getImageData（有些指纹库用这个代替 toDataURL）
        var origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
            var imageData = origGetImageData.call(this, sx, sy, sw, sh);
            for (var i = 0; i < imageData.data.length; i += 16) {
                imageData.data[i] ^= 1;  // 每 4 像素改 1 bit，视觉不可见
            }
            return imageData;
        };
    })();

    /* ── 7. WebRTC IP 泄露防护 — 从 SDP 中剥离本地 IP 候选 ── */
    (function() {
        var OrigRTC = window.RTCPeerConnection || window.webkitRTCPeerConnection;
        if (OrigRTC) {
            window.RTCPeerConnection = function(config, constraints) {
                var pc = new OrigRTC(config || {}, constraints || {});
                var origCreateOffer = pc.createOffer.bind(pc);
                var origCreateAnswer = pc.createAnswer.bind(pc);

                function stripHostCandidates(sdp) {
                    return sdp.replace(/a=candidate:.*typ host.*\\r\\n/g, '');
                }

                pc.createOffer = function(opts) {
                    return origCreateOffer(opts || undefined).then(function(offer) {
                        offer.sdp = stripHostCandidates(offer.sdp);
                        return offer;
                    });
                };
                pc.createAnswer = function(opts) {
                    return origCreateAnswer(opts || undefined).then(function(answer) {
                        answer.sdp = stripHostCandidates(answer.sdp);
                        return answer;
                    });
                };
                return pc;
            };
            window.RTCPeerConnection.prototype = OrigRTC.prototype;
        }
    })();

    /* ── 8. Screen 属性一致性 — 与视口保持一致 ── */
    Object.defineProperty(screen, 'width',       { get: () => window.outerWidth || window.innerWidth, configurable: true });
    Object.defineProperty(screen, 'height',      { get: () => window.outerHeight || window.innerHeight, configurable: true });
    Object.defineProperty(screen, 'availWidth',  { get: () => screen.width, configurable: true });
    Object.defineProperty(screen, 'availHeight', { get: () => screen.height - 40, configurable: true });
    Object.defineProperty(screen, 'colorDepth',  { get: () => 24, configurable: true });
    Object.defineProperty(screen, 'pixelDepth',  { get: () => 24, configurable: true });

    /* ── 9. hardwareConcurrency 随机 ── */
    Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => [4, 8, 12, 16][Math.floor(Math.random() * 4)],
        configurable: true,
    });

    /* ── 10. Device Memory ── */
    Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
        configurable: true,
    });

    /* ── 11. Network Connection API ── */
    Object.defineProperty(navigator, 'connection', {
        get: () => ({
            effectiveType: '4g',
            rtt: 50,
            downlink: 10,
            saveData: false,
            addEventListener: function() {},
            removeEventListener: function() {},
        }),
        configurable: true,
    });

    /* ── 12. Permission API ── */
    var origPermissionsQuery = window.Permissions && window.Permissions.prototype.query;
    if (origPermissionsQuery) {
        window.Permissions.prototype.query = function(permission) {
            return Promise.resolve({ state: 'granted', name: permission.name || permission });
        };
    }

    /* ── 13. matchMedia 伪装 ── */
    Object.defineProperty(window, 'matchMedia', {
        value: (query) => ({
            matches: false,
            media: query,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        }),
        configurable: true,
    });

    /* ── 14. 清除 CDP / Playwright 自动化痕迹 ── */
    var _Error = Error;
    Object.defineProperty(_Error, 'prepareStackTrace', { value: '', configurable: true });

    try { delete window.__playwright_evaluation_script__; } catch(e) {}
    try { delete window.__pw_manual; } catch(e) {}

    /* ── 15. iframe 隔离 — 子 frame 也隐藏 webdriver 标志 ── */
    (function() {
        try {
            var desc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
            if (desc && desc.get) {
                Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
                    get: function() {
                        var win = desc.get.call(this);
                        try {
                            Object.defineProperty(win.navigator, 'webdriver', {
                                get: () => false, configurable: true,
                            });
                        } catch(e) {}
                        return win;
                    },
                });
            }
        } catch(e) {}
    })();
    """


def human_delay(min_s: float = 1.0, max_s: float = 3.0) -> float:
    """返回一个随机的人类化延迟时间。"""
    return random.uniform(min_s, max_s)


def human_mouse_move(page) -> None:
    """模拟人类鼠标移动：二次贝塞尔曲线路径，比直线更接近真实轨迹。"""
    viewport = page.viewport_size
    if not viewport:
        return

    w, h = viewport['width'], viewport['height']

    # 起点（页面中部偏移区域）
    sx = random.randint(int(w * 0.2), int(w * 0.8))
    sy = random.randint(int(h * 0.2), int(h * 0.8))
    # 终点
    ex = random.randint(int(w * 0.1), int(w * 0.9))
    ey = random.randint(int(h * 0.1), int(h * 0.9))
    # 贝塞尔控制点（在起终点之间随机偏移）
    cx = (sx + ex) / 2 + random.randint(-150, 150)
    cy = (sy + ey) / 2 + random.randint(-150, 150)

    steps = random.randint(15, 30)
    for i in range(1, steps + 1):
        t = i / steps
        # 二次贝塞尔插值: B(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
        x = (1 - t) ** 2 * sx + 2 * (1 - t) * t * cx + t ** 2 * ex
        y = (1 - t) ** 2 * sy + 2 * (1 - t) * t * cy + t ** 2 * ey
        page.mouse.move(int(x), int(y))
        # 模拟手部微颤 + 随机微停顿
        time.sleep(random.uniform(0.008, 0.04))

    time.sleep(human_delay(0.2, 0.8))


# ── Page Lifecycle ─────────────────────────────────────────────────────────

@contextmanager
def open_page(context):
    """创建页面上下文，确保使用后自动关闭，防止内存泄漏。"""
    page = context.new_page()
    try:
        yield page
    finally:
        page.close()


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
    """导航到 URL，处理验证码和频率限制。

    使用循环而非递归，避免栈溢出。最多重试 MAX_NAV_DEPTH 次。
    """
    for attempt in range(1, MAX_NAV_DEPTH + 1):
        try:
            page.goto(url, wait_until='domcontentloaded', timeout=30000)
        except PlaywrightTimeout:
            log_fail(f"页面加载超时 (第 {attempt} 次)")
            return None
        except Exception as e:
            err_msg = str(e)
            if 'ERR_PROXY_CONNECTION_FAILED' in err_msg:
                raise ProxyFailedError(err_msg)
            if 'ERR_CONNECTION' in err_msg or 'ERR_TUNNEL' in err_msg:
                log_fail(f"网络连接错误 (第 {attempt} 次): {err_msg}")
                if attempt < MAX_NAV_DEPTH:
                    time.sleep(5)
                    continue
                return None
            # 其他未知错误也优雅处理
            log_fail(f"页面加载异常 (第 {attempt} 次): {err_msg}")
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

        # ── 频率限制检查 ──
        title = page.title()
        if '抱歉' in title or '频繁' in title:
            if attempt < MAX_NAV_DEPTH:
                log_warn(f"触发频率限制 (第 {attempt} 次)，等待 {COOLDOWN_SEC}s 冷却...")
                time.sleep(COOLDOWN_SEC)
                continue  # 循环重试
            else:
                log_fail(f"频率限制重试已达 {MAX_NAV_DEPTH} 次，放弃此页")
                return None

        # ── 模拟人类行为：贝塞尔鼠标移动 + 多段随机滚动 ──
        try:
            human_mouse_move(page)
            for _ in range(random.randint(1, 3)):
                scroll_px = random.randint(200, 600)
                page.evaluate(f'window.scrollBy(0, {scroll_px})')
                time.sleep(human_delay(0.3, 1.0))
        except Exception:
            pass

        return page.content()

    return None  # 理论上不会到达


# ── Main Scraper ──────────────────────────────────────────────────────────

def scrape_city(
    city_name: str,
    city_code: str,
    context,
    data_month: str,
    checkpoint: dict,
    all_results: dict,
) -> None:
    """抓取一个城市的所有区县数据，支持断点续爬。

    直接修改 all_results（引用传递），不返回值以避免引用混淆。
    """
    seed_code = SEEDS.get(city_code)
    if not seed_code:
        log_fail(f"{city_name}: 无种子区，跳过")
        return

    # Phase 1: 发现区县
    seed_url = f"{BASE_URL}/district/{seed_code}.html?city={city_code}"
    log_info("发现区县中...")

    with open_page(context) as page:
        html = navigate(page, seed_url)

    if not html:
        log_fail(f"{city_name}: 无法加载种子页")
        return

    province = extract_province(html, city_name)
    districts = parse_districts(html)

    if not districts:
        log_fail(f"{city_name}: 未发现区县")
        return

    log_info(f"发现 {C_BOLD}{len(districts)}{C_RESET} 个区 (省: {province or '?'})")

    # 恢复已有数据或初始化
    city_data = all_results.get(city_name, {'province': province, 'districts': {}})
    city_data['province'] = province  # 确保省份信息最新

    # Phase 2: 逐区逐类型抓取
    total_tasks = len(districts) * len(TRADES)
    done_tasks = 0
    skipped_tasks = 0
    failed_tasks = 0
    start_time = time.time()
    save_counter = 0

    for dist_idx, (dist_code, dist_name) in enumerate(districts, 1):
        # 统计该区已完成的 trade 数
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

        # 每个区用一个 page 复用，减少创建/销毁开销
        with open_page(context) as page:
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

                html = navigate(page, url)
                parsed = parse_overview(html) if html else None
                entry[trade['key']] = parsed

                if parsed:
                    log_ok(f"{dist_name} → {trade['label']}: "
                           f"{parsed.get('unit_price_display', 'N/A')}")
                    mark_completed(checkpoint, city_name, dist_name, trade['key'])
                    done_tasks += 1
                else:
                    log_fail(f"{dist_name} → {trade['label']}: 无数据")
                    failed_tasks += 1

                save_counter += 1
                if save_counter >= CHECKPOINT_SAVE_INTERVAL:
                    save_counter = 0
                    save_checkpoint(data_month, checkpoint, all_results, city_name)

                # 页面间随机延迟 + ETA
                delay = human_delay(PAGE_DELAY_MIN, PAGE_DELAY_MAX)
                newly_done = done_tasks - skipped_tasks
                remaining = total_tasks - done_tasks
                if remaining > 0 and newly_done > 0:
                    elapsed = time.time() - start_time
                    eta_sec = (elapsed / newly_done) * remaining
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

    # 城市结束时最终保存
    save_checkpoint(data_month, checkpoint, all_results, city_name)

    elapsed = time.time() - start_time
    parts = []
    if done_tasks - skipped_tasks > 0:
        parts.append(f"{done_tasks - skipped_tasks} 新爬取")
    if skipped_tasks > 0:
        parts.append(f"{skipped_tasks} 跳过")
    if failed_tasks > 0:
        parts.append(f"{failed_tasks} 失败")
    summary = ', '.join(parts) if parts else str(done_tasks) + ' 条'
    log_ok(f"{city_name} 完成 | {summary} | 耗时 {elapsed:.0f}s")


def main():
    parser = argparse.ArgumentParser(description='Creprice 隐身爬虫（支持断点续爬 + 代理)')
    parser.add_argument('--month', type=str, default=None, help='目标月份 YYYY-MM')
    parser.add_argument('--headless', action='store_true', help='无头模式')
    parser.add_argument('--output', type=str, default='housing_prices.json', help='输出 JSON 路径')
    parser.add_argument('--city', type=str, default=None, help='只爬指定城市')
    parser.add_argument('--reset', action='store_true', help='清除断点，从头开始')
    parser.add_argument('--proxy', type=str, default=None,
                        help='手动指定代理（如 http://IP:PORT），否则自动从快代理发现可用代理')

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

    # ── 断点：重置模式 ──
    if args.reset:
        cp_path = _checkpoint_path(data_month)
        res_path = _result_path(data_month)
        for p in (cp_path, res_path):
            if p.exists():
                p.unlink()
        for city_name in CITIES:
            city_res_path = _city_result_path(data_month, city_name)
            if city_res_path.exists():
                city_res_path.unlink()
        log_info("已清除断点文件")

    # ── Banner ──
    print()
    log_banner("Creprice 隐身爬虫 v5 — 自动代理发现 + 断点续爬")
    log_info(f"月份: {C_BOLD}{data_month}{C_RESET}")
    log_info(f"城市: {C_BOLD}{', '.join(cities.keys())}{C_RESET}")
    log_info(f"延迟: {PAGE_DELAY_MIN}-{PAGE_DELAY_MAX}s/页")
    log_info(f"输出: {args.output}")
    log_info(f"数据: {DATA_DIR}")
    log_info(f"模式: {'无头' if args.headless else '有头(推荐)'}")
    print()

    # ── 初始化代理管理器 ──
    proxy_manager = ProxyManager(initial_proxy=args.proxy)

    # 启动 15 分钟提醒线程
    proxy_manager.start_reminder()

    # 加载断点
    checkpoint, cities_result = load_checkpoint(data_month)

    COOKIE_DIR.mkdir(exist_ok=True)
    start = time.time()
    city_idx = 0
    total_cities = len(cities)

    try:
        with sync_playwright() as p:
            for city_name, city_code in cities.items():
                city_idx += 1

                # ── 城市级别代理重试 ──
                # 如果 --proxy 手动指定，先试手动代理；失败后也自动发现
                proxy_retry = 0
                max_proxy_retries = ProxyManager.MAX_PROXY_RETRIES

                while proxy_retry < max_proxy_retries:
                    # 获取当前代理（可能是手动的，也可能是自动发现的）
                    proxy = proxy_manager.get_proxy()

                    vp = random.choice(VIEWPORTS)
                    ua = random.choice(USER_AGENTS)

                    log_divider('─')
                    proxy_label = f"代理: {C_BOLD}{proxy}{C_RESET}" if proxy else f"{C_DIM}直连{C_RESET}"
                    log(
                        f"  [{C_BOLD}{city_idx}/{total_cities}{C_RESET}] "
                        f"{C_BOLD}{city_name}{C_RESET} ({city_code}) "
                        f"{C_DIM}[{vp['width']}x{vp['height']}] [{proxy_label}]",
                        C_WHITE,
                    )
                    log_divider('─')

                    # 构建 context
                    context_kwargs: dict = {}
                    if proxy:
                        context_kwargs['proxy'] = {'server': proxy}

                    context = p.chromium.launch_persistent_context(
                        user_data_dir=str(COOKIE_DIR),
                        headless=args.headless,
                        locale='zh-CN',
                        viewport=vp,
                        args=['--disable-blink-features=AutomationControlled'],
                        user_agent=ua,
                        **context_kwargs,
                    )
                    context.add_init_script(stealth_init_script())

                    try:
                        scrape_city(
                            city_name, city_code, context,
                            data_month, checkpoint, cities_result,
                        )
                        break  # 成功，跳出重试循环，进入下一个城市
                    except ProxyFailedError:
                        proxy_retry += 1
                        proxy_manager.mark_failed()
                        if proxy_retry < max_proxy_retries:
                            log_info(f"正在自动发现新代理，重试城市 {city_name} "
                                     f"({proxy_retry}/{max_proxy_retries})")
                        else:
                            log_fail(f"城市 {city_name} 代理重试 {max_proxy_retries} 次"
                                      f"均失败，跳过该城市")
                    finally:
                        context.close()
    finally:
        proxy_manager.stop_reminder()

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
        'update_time': datetime.now().isoformat(),
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
