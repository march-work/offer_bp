#!/usr/bin/env python3
"""
测试天齐代理 - 多种方式
"""
import sys
import random
import urllib.request
import json
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

# 你的天齐代理API URL
API_URL = 'http://api.tianqiip.com/getip?secret=nrws9oawizktrccc&num=3&type=json&port=1&time=15&ys=1&cs=1&mr=1&sign=f3ade5ac5d10a4a56dd7952efc3648bb'

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
]


def get_proxies():
    """获取多个代理"""
    print("正在从天齐代理获取代理...")
    try:
        req = urllib.request.Request(
            API_URL,
            headers={'User-Agent': random.choice(USER_AGENTS)},
        )
        resp = urllib.request.urlopen(req, timeout=10)
        json_str = resp.read().decode('utf-8', errors='ignore')
        data = json.loads(json_str)
        
        if data.get('code') == 1000:
            proxy_list = data.get('data', [])
            print(f"[OK] 获取到 {len(proxy_list)} 个代理:")
            proxies = []
            for i, proxy_info in enumerate(proxy_list, 1):
                ip = proxy_info.get('ip')
                port = proxy_info.get('port')
                proxy_url = f"http://{ip}:{port}"
                proxies.append(proxy_url)
                print(f"  [{i}] {proxy_url} ({proxy_info.get('prov', '?')} {proxy_info.get('city', '?')})")
            return proxies
        
        print(f"[FAIL] API返回错误: {data}")
        return []
    except Exception as e:
        print(f"[FAIL] 获取代理失败: {e}")
        import traceback
        traceback.print_exc()
        return []


def test_proxy_simple(proxy_url):
    """简单测试代理（urllib）"""
    print(f"\n测试: {proxy_url}")
    print("-" * 50)
    
    try:
        proxy_handler = urllib.request.ProxyHandler({
            'http': proxy_url,
            'https': proxy_url,
        })
        opener = urllib.request.build_opener(proxy_handler)
        
        # 测试目标网站
        print("  访问 creprice.cn...")
        req = urllib.request.Request(
            'https://www.creprice.cn',
            headers={'User-Agent': random.choice(USER_AGENTS)},
        )
        resp = opener.open(req, timeout=20)
        html = resp.read().decode('utf-8', errors='ignore')
        
        print(f"  [OK] 状态码: {resp.status}")
        print(f"  [OK] 内容长度: {len(html)}")
        
        if 'authcode' in html or '验证码' in html:
            print("  [WARN] 触发验证码")
        elif '抱歉' in html and '频繁' in html:
            print("  [WARN] 触发频率限制")
        elif resp.status == 200 and len(html) > 2000:
            print("  [OK] 页面正常！")
        
        return True
        
    except Exception as e:
        print(f"  [FAIL] {e}")
        return False


def main():
    print("=" * 60)
    print("天齐代理测试")
    print("=" * 60)
    
    # 1. 获取代理
    proxies = get_proxies()
    if not proxies:
        print("\n无法获取代理")
        return 1
    
    # 2. 测试每个代理
    print("\n" + "=" * 60)
    print("开始测试代理")
    print("=" * 60)
    
    success_count = 0
    for proxy in proxies:
        if test_proxy_simple(proxy):
            success_count += 1
    
    # 3. 总结
    print("\n" + "=" * 60)
    print(f"总结: {success_count}/{len(proxies)} 个代理可用")
    print("=" * 60)
    
    if success_count > 0:
        print("\n[OK] 有可用的代理！")
        print("\n现在你可以运行爬虫了:")
        print("  python creprice_scraper.py")
        return 0
    else:
        print("\n[WARN] 没有可用的代理")
        print("\n可能的原因:")
        print("  1. 代理需要用户名/密码认证")
        print("  2. 代理协议不匹配（试试HTTPS或SOCKS5）")
        print("  3. 请联系天齐代理客服确认代理使用方式")
        return 1


if __name__ == '__main__':
    sys.exit(main())