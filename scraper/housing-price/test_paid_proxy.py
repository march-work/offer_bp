#!/usr/bin/env python3
"""
测试天齐代理付费API
"""
import sys
import random
import urllib.request
import json

# 你的天齐代理API URL
API_URL = 'http://api.tianqiip.com/getip?secret=nrws9oawizktrccc&num=5&type=json&port=1&time=15&ys=1&cs=1&mr=1&sign=f3ade5ac5d10a4a56dd7952efc3648bb'

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
]


def fetch_paid_proxies():
    """从天齐代理API获取付费代理"""
    print("="*70)
    print("测试天齐代理付费API")
    print("="*70)
    print(f"\n正在调用 API: {API_URL}")
    
    proxies = []
    try:
        req = urllib.request.Request(
            API_URL,
            headers={'User-Agent': random.choice(USER_AGENTS)},
        )
        resp = urllib.request.urlopen(req, timeout=10)
        json_str = resp.read().decode('utf-8', errors='ignore')
        
        print(f"\nAPI 响应:")
        print("-"*70)
        print(json_str)
        print("-"*70)
        
        data = json.loads(json_str)
        
        if data.get('code') == 1000:
            print("\n[OK] API调用成功!")
            proxy_list = data.get('data', [])
            print(f"获取到 {len(proxy_list)} 个代理:\n")
            
            for i, proxy_info in enumerate(proxy_list, 1):
                ip = proxy_info.get('ip')
                port = proxy_info.get('port')
                city = proxy_info.get('city', '未知')
                prov = proxy_info.get('prov', '未知')
                isp = proxy_info.get('isp', '未知')
                expire = proxy_info.get('expire', '未知')
                
                proxy_url = f"http://{ip}:{port}"
                proxies.append(proxy_url)
                
                print(f"  [{i}] {proxy_url}")
                print(f"      位置: {prov} {city}")
                print(f"      运营商: {isp}")
                if expire != '未知':
                    print(f"      过期时间: {expire}")
                print()
            
            return proxies
        else:
            print(f"\n[FAIL] API返回错误: code={data.get('code')}, msg={data.get('Msg', '未知错误')}")
            return []
            
    except Exception as e:
        print(f"\n[FAIL] 调用API失败: {e}")
        import traceback
        traceback.print_exc()
        return []


def test_proxy(proxy_url):
    """测试单个代理是否可用"""
    print(f"\n测试代理: {proxy_url}")
    print("-"*70)
    
    try:
        # 1. 测试 httpbin.org/ip
        print("  [1/3] 测试 httpbin.org/ip...")
        proxy_handler = urllib.request.ProxyHandler({
            'http': proxy_url,
            'https': proxy_url,
        })
        opener = urllib.request.build_opener(proxy_handler)
        req = urllib.request.Request(
            'https://httpbin.org/ip',
            headers={'User-Agent': random.choice(USER_AGENTS)},
        )
        resp = opener.open(req, timeout=10)
        result = json.loads(resp.read().decode('utf-8'))
        print(f"      [OK] 你的IP: {result.get('origin')}")
        
        # 2. 测试百度
        print("  [2/3] 测试百度...")
        req = urllib.request.Request(
            'https://www.baidu.com',
            headers={'User-Agent': random.choice(USER_AGENTS)},
        )
        resp = opener.open(req, timeout=10)
        print(f"      [OK] 状态码: {resp.status}, 内容长度: {len(resp.read())}")
        
        # 3. 测试目标网站 creprice.cn
        print("  [3/3] 测试 creprice.cn...")
        req = urllib.request.Request(
            'https://www.creprice.cn',
            headers={'User-Agent': random.choice(USER_AGENTS)},
        )
        resp = opener.open(req, timeout=15)
        html = resp.read().decode('utf-8', errors='ignore')
        
        if 'authcode' in html or '验证码' in html:
            print("      [WARN] 可以访问，但触发了验证码")
            return 'captcha'
        elif '抱歉' in html and '频繁' in html:
            print("      [WARN] 可以访问，但触发了频率限制")
            return 'rate_limit'
        elif resp.status == 200 and len(html) > 2000:
            print(f"      [OK] 完美! 可以正常访问 creprice.cn")
            print(f"           状态码: {resp.status}, 内容长度: {len(html)}")
            return 'working'
        else:
            print(f"      [WARN] 可以访问，但页面异常")
            return 'abnormal'
            
    except Exception as e:
        print(f"      [FAIL] 测试失败: {e}")
        return 'failed'


def main():
    # 1. 获取代理
    proxies = fetch_paid_proxies()
    
    if not proxies:
        print("\n未获取到任何代理")
        return 1
    
    # 2. 测试每个代理
    print("\n" + "="*70)
    print("开始测试代理")
    print("="*70)
    
    results = []
    for proxy in proxies:
        result = test_proxy(proxy)
        results.append((proxy, result))
    
    # 3. 总结
    print("\n" + "="*70)
    print("总结")
    print("="*70)
    
    working_count = 0
    for proxy, result in results:
        status_map = {
            'working': '[OK]',
            'captcha': '[CAPTCHA]',
            'rate_limit': '[RATE_LIMIT]',
            'abnormal': '[ABNORMAL]',
            'failed': '[FAIL]',
        }
        status = status_map.get(result, '[?]')
        print(f"{status} {proxy}")
        
        if result == 'working':
            working_count += 1
    
    print(f"\n完全可用的代理: {working_count}/{len(proxies)}")
    
    if working_count > 0:
        print("\n[SUCCESS] 付费代理工作正常!")
        print("\n你现在可以运行爬虫了:")
        print("  python creprice_scraper.py")
        return 0
    else:
        print("\n[WARNING] 没有完全可用的代理")
        print("但爬虫会自动处理验证码和频率限制")
        print("\n你可以试试运行爬虫:")
        print("  python creprice_scraper.py")
        return 0


if __name__ == '__main__':
    sys.exit(main())