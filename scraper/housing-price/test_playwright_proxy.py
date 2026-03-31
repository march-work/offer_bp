#!/usr/bin/env python3
"""
简单测试：使用Playwright和付费代理访问网站
"""
import sys
import random
import urllib.request
import json
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from playwright.sync_api import sync_playwright

# 你的天齐代理API URL
API_URL = 'http://api.tianqiip.com/getip?secret=nrws9oawizktrccc&num=1&type=json&port=1&time=15&ys=1&cs=1&mr=1&sign=f3ade5ac5d10a4a56dd7952efc3648bb'

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
]


def get_one_proxy():
    """获取一个代理"""
    print("正在从天齐代理获取一个代理...")
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
            if proxy_list:
                proxy_info = proxy_list[0]
                ip = proxy_info.get('ip')
                port = proxy_info.get('port')
                proxy_url = f"http://{ip}:{port}"
                print(f"[OK] 获取到代理: {proxy_url}")
                print(f"     位置: {proxy_info.get('prov', '?')} {proxy_info.get('city', '?')}")
                print(f"     运营商: {proxy_info.get('isp', '?')}")
                return proxy_url
        
        print(f"[FAIL] API返回错误: {data}")
        return None
    except Exception as e:
        print(f"[FAIL] 获取代理失败: {e}")
        import traceback
        traceback.print_exc()
        return None


def test_with_playwright(proxy_url):
    """使用Playwright测试代理"""
    print("\n" + "="*60)
    print("使用Playwright测试代理")
    print("="*60)
    print(f"代理: {proxy_url}")
    
    try:
        with sync_playwright() as p:
            print("\n[1/3] 启动浏览器...")
            browser = p.chromium.launch(headless=True)
            
            print("[2/3] 创建上下文（使用代理）...")
            context = browser.new_context(
                proxy={'server': proxy_url},
                user_agent=random.choice(USER_AGENTS),
                viewport={'width': 1920, 'height': 1080},
            )
            
            print("[3/3] 访问 httpbin.org/ip 查看IP...")
            page = context.new_page()
            response = page.goto('https://httpbin.org/ip', wait_until='domcontentloaded', timeout=30000)
            content = page.content()
            
            print("\n" + "-"*60)
            print("响应状态:", response.status)
            print("页面内容:")
            print(content[:500])
            print("-"*60)
            
            if response.status == 200:
                print("\n[OK] 代理工作正常！")
                result = json.loads(page.inner_text('body'))
                print(f"你的IP: {result.get('origin')}")
                
                # 也试试访问目标网站
                print("\n再试试访问 creprice.cn...")
                try:
                    page.goto('https://www.creprice.cn', wait_until='domcontentloaded', timeout=30000)
                    title = page.title()
                    print(f"[OK] 成功访问 creprice.cn")
                    print(f"页面标题: {title}")
                except Exception as e:
                    print(f"[WARN] 访问 creprice.cn 失败: {e}")
                
                context.close()
                browser.close()
                return True
            else:
                print(f"\n[FAIL] 响应状态异常: {response.status}")
                context.close()
                browser.close()
                return False
                
    except Exception as e:
        print(f"\n[FAIL] 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    # 1. 获取代理
    proxy = get_one_proxy()
    if not proxy:
        print("\n无法获取代理")
        return 1
    
    # 2. 测试代理
    success = test_with_playwright(proxy)
    
    if success:
        print("\n" + "="*60)
        print("[SUCCESS] 付费代理 + Playwright 工作正常！")
        print("="*60)
        print("\n现在你可以运行爬虫了:")
        print("  python creprice_scraper.py")
        return 0
    else:
        print("\n[FAIL] 测试失败")
        return 1


if __name__ == '__main__':
    sys.exit(main())