#!/usr/bin/env python3
"""
简单测试天齐代理API，查看详细错误
"""
import sys
import urllib.request

# 你的天齐代理API URL
API_URL = 'http://api.tianqiip.com/getip?secret=nrws9oawizktrccc&num=1&type=json&port=1&time=15&ys=1&cs=1&mr=1&sign=f3ade5ac5d10a4a56dd7952efc3648bb'


def main():
    print("测试天齐代理API")
    print("="*60)
    print(f"URL: {API_URL}")
    print()
    
    try:
        req = urllib.request.Request(API_URL)
        resp = urllib.request.urlopen(req, timeout=10)
        print(f"状态码: {resp.status}")
        print()
        print("响应内容:")
        print("-"*60)
        print(resp.read().decode('utf-8'))
        print("-"*60)
    except urllib.error.HTTPError as e:
        print(f"HTTP错误: {e.code}")
        print()
        print("错误响应内容:")
        print("-"*60)
        print(e.read().decode('utf-8', errors='ignore'))
        print("-"*60)
        print()
        print("提示: 根据天齐代理文档，400错误可能是因为:")
        print("  1. 需要先添加你的IP到白名单")
        print("  2. 请访问: http://api.tianqiip.com/white/add?...")
        print("  3. 或者在天齐代理网站后台添加白名单")
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()