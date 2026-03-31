#!/usr/bin/env python3
# coding=utf-8
"""
使用requests库测试天齐代理（按照官方示例）
"""
import sys
import requests
import time
import json
import random

# 你的天齐代理API URL
API_URL = 'http://api.tianqiip.com/getip?secret=nrws9oawizktrccc&num=1&type=json&port=1&time=15&ys=1&cs=1&mr=1&sign=f3ade5ac5d10a4a56dd7952efc3648bb'

# 认证信息
PROXY_USERNAME = 'march123'
PROXY_PASSWORD = 'mc123456'

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
]


def get_one_proxy():
    """获取一个代理"""
    print("="*60)
    print("从天齐代理获取代理")
    print("="*60)
    
    try:
        resp = requests.get(API_URL, timeout=10)
        print(f"API响应状态码: {resp.status_code}")
        print(f"API响应内容:")
        print("-"*60)
        print(resp.text)
        print("-"*60)
        
        data = resp.json()
        if data.get('code') == 1000:
            proxy_list = data.get('data', [])
            if proxy_list:
                proxy_info = proxy_list[0]
                ip = proxy_info.get('ip')
                port = proxy_info.get('port')
                print(f"\n[OK] 获取到代理: {ip}:{port}")
                print(f"     位置: {proxy_info.get('prov', '?')} {proxy_info.get('city', '?')}")
                print(f"     运营商: {proxy_info.get('isp', '?')}")
                return ip, port
        
        print(f"\n[FAIL] API返回错误: {data}")
        return None, None
        
    except Exception as e:
        print(f"\n[FAIL] 获取代理失败: {e}")
        import traceback
        traceback.print_exc()
        return None, None


def test_proxy(ip, port):
    """按照官方示例测试代理"""
    print("\n" + "="*60)
    print("测试代理（按照官方示例）")
    print("="*60)
    
    # 代理服务器
    proxyHost = ip
    proxyPort = port

    # 非账号密码验证
    # proxyMeta = "http://%(host)s:%(port)s" % {
    #     "host": proxyHost,
    #     "port": proxyPort,
    # }
    
    # 账号密码验证
    proxyMeta = "http://%(user)s:%(pwd)s@%(host)s:%(port)s" % {
        "user": PROXY_USERNAME,
        "pwd": PROXY_PASSWORD,
        "host": proxyHost,
        "port": proxyPort,
    }

    proxies = {
        "http": proxyMeta,
        "https": proxyMeta
    }
    
    print(f"使用代理: {proxyMeta}")
    print()
    
    # 测试1: http://myip.ipip.net（官方示例用的）
    print("[1/2] 测试 http://myip.ipip.net...")
    try:
        start = int(round(time.time() * 1000))
        resp = requests.get("http://myip.ipip.net", proxies=proxies, timeout=10)
        costTime = int(round(time.time() * 1000)) - start
        print(f"  [OK] 响应: {resp.text.strip()}")
        print(f"  [OK] 耗时: {costTime}ms")
    except Exception as e:
        print(f"  [FAIL] {e}")
        import traceback
        traceback.print_exc()
    
    # 测试2: creprice.cn
    print("\n[2/2] 测试 creprice.cn...")
    try:
        start = int(round(time.time() * 1000))
        resp = requests.get(
            "https://www.creprice.cn", 
            proxies=proxies, 
            timeout=15,
            headers={'User-Agent': random.choice(USER_AGENTS)}
        )
        costTime = int(round(time.time() * 1000)) - start
        print(f"  [OK] 状态码: {resp.status_code}")
        print(f"  [OK] 内容长度: {len(resp.content)}")
        print(f"  [OK] 耗时: {costTime}ms")
        
        html = resp.text
        if 'authcode' in html or '验证码' in html:
            print("  [WARN] 触发验证码")
        elif '抱歉' in html and '频繁' in html:
            print("  [WARN] 触发频率限制")
        elif resp.status_code == 200 and len(html) > 2000:
            print("  [OK] 页面正常！")
        
        return True
        
    except Exception as e:
        print(f"  [FAIL] {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    # 1. 获取代理
    ip, port = get_one_proxy()
    if not ip or not port:
        print("\n无法获取代理")
        return 1
    
    # 2. 测试代理
    success = test_proxy(ip, port)
    
    # 3. 总结
    print("\n" + "="*60)
    if success:
        print("[SUCCESS] 代理测试通过！")
        print("="*60)
        print("\n现在你可以运行爬虫了:")
        print("  python creprice_scraper.py")
        return 0
    else:
        print("[FAIL] 代理测试失败")
        print("="*60)
        return 1


if __name__ == '__main__':
    sys.exit(main())