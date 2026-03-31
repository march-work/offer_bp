#!/usr/bin/env python3
"""
简单测试从 89ip.cn 获取代理
"""
import sys
import re
import random
import urllib.request
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
]

PROXY_SOURCE_URL = 'https://www.89ip.cn/'


def fetch_free_proxies(timeout=10):
    """从 89ip.cn 免费页面抓取代理 IP 列表"""
    print(f"正在从 {PROXY_SOURCE_URL} 获取免费代理...")
    proxies = []
    try:
        req = urllib.request.Request(
            PROXY_SOURCE_URL,
            headers={'User-Agent': random.choice(USER_AGENTS)},
        )
        resp = urllib.request.urlopen(req, timeout=timeout)
        html = resp.read().decode('utf-8', errors='ignore')

        # 提取每行中的 IP 和 PORT
        ip_pattern = re.compile(
            r'<tr>\s*<td>\s*(\d+\.\d+\.\d+\.\d+)\s*</td>\s*<td>\s*(\d+)\s*</td>',
            re.DOTALL,
        )
        for m in ip_pattern.finditer(html):
            ip, port = m.group(1), m.group(2)
            proxies.append(f"http://{ip}:{port}")

        print(f"获取到 {len(proxies)} 个代理 IP")
        if proxies:
            print("前 5 个代理:")
            for i, p in enumerate(proxies[:5], 1):
                print(f"  {i}. {p}")
    except Exception as e:
        print(f"获取代理列表失败: {e}")
        import traceback
        traceback.print_exc()

    return proxies


def quick_verify_proxy(proxy_url, timeout=15):
    """快速验证代理是否可以正常访问 creprice.cn"""
    print(f"正在验证: {proxy_url} ...")
    try:
        proxy_handler = urllib.request.ProxyHandler({
            'http': proxy_url,
            'https': proxy_url,
        })
        opener = urllib.request.build_opener(proxy_handler)
        req = urllib.request.Request(
            'https://www.creprice.cn',
            headers={'User-Agent': random.choice(USER_AGENTS)},
        )
        resp = opener.open(req, timeout=timeout)
        html = resp.read().decode('utf-8', errors='ignore')

        if 'authcode' in html or '验证码' in html:
            print("  触发验证码")
            return False
        if '抱歉' in html and '频繁' in html:
            print("  触发频率限制")
            return False
        if resp.status == 200 and len(html) > 2000:
            print("  [OK] 代理可用！")
            return True
        print(f"  状态码: {resp.status}, 内容长度: {len(html)}")
        return False
    except Exception as e:
        print(f"  失败: {e}")
        return False


def main():
    print("=" * 60)
    print("测试 89ip.cn 代理获取")
    print("=" * 60)
    
    # 1. 获取代理列表
    proxies = fetch_free_proxies()
    
    if not proxies:
        print("未获取到任何代理")
        return 1
    
    print(f"\n共获取 {len(proxies)} 个代理，开始验证前 5 个...")
    print("-" * 60)
    
    # 2. 验证前 5 个代理
    success_count = 0
    for i, proxy in enumerate(proxies[:5], 1):
        print(f"\n[{i}/5] ", end="")
        if quick_verify_proxy(proxy):
            success_count += 1
    
    print("\n" + "=" * 60)
    print(f"测试完成！测试了 5 个代理，可用 {success_count} 个")
    
    if success_count > 0:
        print("\n[SUCCESS] 89ip.cn 代理源工作正常！")
        print("\n你现在可以运行爬虫了:")
        print("  python creprice_scraper.py")
        return 0
    else:
        print("\n[WARNING] 前 5 个代理都不可用")
        print("这是正常的 - 免费代理质量参差不齐")
        print("\n爬虫会自动测试所有代理并找到可用的")
        print("你可以直接运行爬虫试试:")
        print("  python creprice_scraper.py")
        return 0


if __name__ == '__main__':
    sys.exit(main())