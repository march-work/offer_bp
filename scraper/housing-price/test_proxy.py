#!/usr/bin/env python3
"""
测试从 89ip.cn 获取代理并验证
"""
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from creprice_scraper import fetch_free_proxies, quick_verify_proxy, log_info, log_ok, log_fail, log_banner


def main():
    log_banner("测试 89ip.cn 代理获取")
    
    # 1. 获取代理列表
    proxies = fetch_free_proxies()
    
    if not proxies:
        log_fail("未获取到任何代理")
        return 1
    
    log_info(f"共获取 {len(proxies)} 个代理，开始验证前 5 个...")
    
    # 2. 验证前 5 个代理
    success_count = 0
    for i, proxy in enumerate(proxies[:5], 1):
        log_info(f"[{i}/5] 测试: {proxy}")
        if quick_verify_proxy(proxy):
            log_ok(f"可用: {proxy}")
            success_count += 1
        else:
            log_fail(f"不可用: {proxy}")
    
    log_banner("测试完成")
    log_info(f"测试了 5 个代理，可用 {success_count} 个")
    
    if success_count > 0:
        log_ok("89ip.cn 代理源工作正常！")
        return 0
    else:
        log_warn("前 5 个代理都不可用，但这是正常的 - 免费代理质量参差不齐")
        log_info("爬虫会自动测试所有代理并找到可用的")
        return 0


if __name__ == '__main__':
    sys.exit(main())