#!/usr/bin/env python3
"""
按步骤测试代理：
1. 代理是否活着？→ 访问 httpbin.org/ip 测试
2. 能访问其他网站吗？→ 试下百度
3. 只有目标网站不行？→ 该网站有反爬/拉黑了这个IP
4. 换协议试试？→ HTTP变HTTPS，或加socks5前缀
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
    print(f"[步骤 0] 正在从 {PROXY_SOURCE_URL} 获取免费代理...")
    proxies = []
    try:
        req = urllib.request.Request(
            PROXY_SOURCE_URL,
            headers={'User-Agent': random.choice(USER_AGENTS)},
        )
        resp = urllib.request.urlopen(req, timeout=timeout)
        html = resp.read().decode('utf-8', errors='ignore')

        ip_pattern = re.compile(
            r'<tr>\s*<td>\s*(\d+\.\d+\.\d+\.\d+)\s*</td>\s*<td>\s*(\d+)\s*</td>',
            re.DOTALL,
        )
        for m in ip_pattern.finditer(html):
            ip, port = m.group(1), m.group(2)
            proxies.append(f"http://{ip}:{port}")

        print(f"  获取到 {len(proxies)} 个代理 IP")
    except Exception as e:
        print(f"  获取代理列表失败: {e}")
        import traceback
        traceback.print_exc()

    return proxies


def test_url_through_proxy(proxy_url, test_url, timeout=10, description=""):
    """通过代理测试访问指定 URL"""
    try:
        proxy_handler = urllib.request.ProxyHandler({
            'http': proxy_url,
            'https': proxy_url,
        })
        opener = urllib.request.build_opener(proxy_handler)
        req = urllib.request.Request(
            test_url,
            headers={'User-Agent': random.choice(USER_AGENTS)},
        )
        resp = opener.open(req, timeout=timeout)
        html = resp.read().decode('utf-8', errors='ignore')
        return {
            'success': True,
            'status': resp.status,
            'content_length': len(html),
            'html': html[:200] if len(html) > 200 else html,
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
        }


def analyze_proxy(proxy_url):
    """按步骤分析代理"""
    print(f"\n{'='*70}")
    print(f"分析代理: {proxy_url}")
    print('='*70)
    
    # 步骤 1: 代理是否活着？ → 访问 httpbin.org/ip 测试
    print("\n[步骤 1] 测试代理是否活着 (httpbin.org/ip)...")
    result1 = test_url_through_proxy(proxy_url, 'https://httpbin.org/ip', timeout=10)
    if result1['success']:
        print(f"  [OK] 代理活着!")
        print(f"  状态码: {result1['status']}")
        print(f"  返回内容: {result1['html']}")
    else:
        print(f"  [FAIL] 代理无法连接: {result1['error']}")
        return {'overall': 'dead', 'details': '代理无法连接'}
    
    # 步骤 2: 能访问其他网站吗？ → 试下百度
    print("\n[步骤 2] 测试能否访问百度...")
    result2 = test_url_through_proxy(proxy_url, 'https://www.baidu.com', timeout=10)
    if result2['success']:
        print(f"  [OK] 可以访问百度!")
        print(f"  状态码: {result2['status']}, 内容长度: {result2['content_length']}")
    else:
        print(f"  [FAIL] 无法访问百度: {result2['error']}")
        return {'overall': 'limited', 'details': '代理无法访问百度'}
    
    # 步骤 3: 只有目标网站不行？ → 该网站有反爬/拉黑了这个IP
    print("\n[步骤 3] 测试能否访问目标网站 creprice.cn...")
    result3 = test_url_through_proxy(proxy_url, 'https://www.creprice.cn', timeout=15)
    if result3['success']:
        html = result3['html']
        if 'authcode' in html or '验证码' in html:
            print(f"  [WARN] 可以访问，但触发了验证码")
            return {'overall': 'captcha', 'details': '代理可用但有验证码'}
        elif '抱歉' in html and '频繁' in html:
            print(f"  [WARN] 可以访问，但触发了频率限制")
            return {'overall': 'rate_limit', 'details': '代理可用但被频率限制'}
        elif result3['status'] == 200 and result3['content_length'] > 2000:
            print(f"  [OK] 完美! 可以正常访问 creprice.cn")
            print(f"  状态码: {result3['status']}, 内容长度: {result3['content_length']}")
            return {'overall': 'working', 'details': '代理完全可用'}
        else:
            print(f"  [WARN] 可以访问，但页面异常")
            print(f"  状态码: {result3['status']}, 内容长度: {result3['content_length']}")
            return {'overall': 'abnormal', 'details': '页面异常'}
    else:
        print(f"  [FAIL] 无法访问 creprice.cn: {result3['error']}")
        print(f"  结论: 代理能访问百度，但不能访问目标网站 → 目标网站可能拉黑了这个IP")
        return {'overall': 'blocked', 'details': '目标网站拉黑了此IP'}


def main():
    print("="*70)
    print("代理深度分析工具")
    print("="*70)
    
    # 1. 获取代理列表
    proxies = fetch_free_proxies()
    
    if not proxies:
        print("未获取到任何代理")
        return 1
    
    print(f"\n共获取 {len(proxies)} 个代理")
    
    # 2. 分析前 5 个代理
    results = []
    for i, proxy in enumerate(proxies[:5], 1):
        result = analyze_proxy(proxy)
        results.append((proxy, result))
    
    # 3. 总结
    print("\n" + "="*70)
    print("总结")
    print("="*70)
    
    working_count = 0
    for proxy, result in results:
        status_emoji = {
            'working': '[OK]',
            'captcha': '[CAPTCHA]',
            'rate_limit': '[RATE_LIMIT]',
            'abnormal': '[ABNORMAL]',
            'blocked': '[BLOCKED]',
            'limited': '[LIMITED]',
            'dead': '[DEAD]',
        }.get(result['overall'], '[?]')
        
        print(f"{status_emoji} {proxy:40} - {result['details']}")
        
        if result['overall'] == 'working':
            working_count += 1
    
    print(f"\n完全可用的代理: {working_count}/{len(results)}")
    
    if working_count > 0:
        print("\n[SUCCESS] 找到可用代理!")
        print("\n你可以直接运行爬虫:")
        print("  python creprice_scraper.py")
        return 0
    else:
        print("\n[WARNING] 前 5 个代理都不完全可用")
        print("但爬虫会测试所有代理，可能后面有可用的")
        print("\n你可以试试运行爬虫:")
        print("  python creprice_scraper.py")
        return 0


if __name__ == '__main__':
    sys.exit(main())