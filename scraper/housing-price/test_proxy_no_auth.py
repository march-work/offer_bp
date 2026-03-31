#!/usr/bin/env python3
# coding=utf-8
"""
测试不带认证的天齐代理
"""
import sys
import requests
import time
import json

# 你的天齐代理API URL
API_URL = 'http://api.tianqiip.com/getip?secret=nrws9oawizktrccc&num=1&type=json&port=1&time=15&ys=1&cs=1&mr=1&sign=f3ade5ac5d10a4a56dd7952efc3648bb'


def get_one_proxy():
    """获取一个代理"""
    print("="*60)
    print("从天齐代理获取代理")
    print("="*60)
    
    try:
        resp = requests.get(API_URL, timeout=10)
        print(f"API响应:")
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
                return ip, port
        
        print(f"\n[FAIL] API返回错误: {data}")
        return None, None
        
    except Exception as e:
        print(f"\n[FAIL] 获取代理失败: {e}")
        import traceback
        traceback.print_exc()
        return None, None


def test_proxy_no_auth(ip, port):
    """测试不带认证的代理"""
    print("\n" + "="*60)
    print("测试代理（不带认证 - 按照官方示例默认方式）")
    print("="*60)
    
    # 非账号密码验证（官方示例默认方式）
    proxyMeta = "http://%(host)s:%(port)s" % {
        "host": ip,
        "port": port,
    }

    proxies = {
        "http": proxyMeta,
        "https": proxyMeta
    }
    
    print(f"使用代理: {proxyMeta}")
    print()
    
    # 测试: http://myip.ipip.net（官方示例用的）
    print("测试 http://myip.ipip.net...")
    try:
        start = int(round(time.time() * 1000))
        resp = requests.get("http://myip.ipip.net", proxies=proxies, timeout=10)
        costTime = int(round(time.time() * 1000)) - start
        print(f"[OK] 响应: {resp.text.strip()}")
        print(f"[OK] 耗时: {costTime}ms")
        return True
    except Exception as e:
        print(f"[FAIL] {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    # 1. 获取代理
    ip, port = get_one_proxy()
    if not ip or not port:
        print("\n无法获取代理")
        return 1
    
    # 2. 测试代理（不带认证）
    success = test_proxy_no_auth(ip, port)
    
    # 3. 总结
    print("\n" + "="*60)
    if success:
        print("[SUCCESS] 代理测试通过（不带认证）！")
        print("="*60)
        return 0
    else:
        print("[FAIL] 代理测试失败")
        print("="*60)
        return 1


if __name__ == '__main__':
    sys.exit(main())