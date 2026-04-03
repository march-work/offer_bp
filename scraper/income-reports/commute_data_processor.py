"""
通勤数据处理脚本 - 用于处理和转换《中国主要城市通勤监测报告》数据
"""

import json
from pathlib import Path

# 城市列表
CITIES = [
    "北京", "上海", "深圳", "广州", "杭州", "南京",
    "成都", "武汉", "西安", "合肥", "青岛"
]

# 基于《中国主要城市通勤监测报告》的单程平均通勤时耗数据（单位：分钟）
# 数据来源：中国城市规划设计研究院《2025年中国主要城市通勤监测报告》
COMMUTE_DATA = {
    "北京": {
        "one_way_average_commute_time": 48,
        "extreme_commute_ratio": 0.29,  # 29%极端通勤（>60分钟）
        "happy_commute_ratio": 0.47,     # 幸福通勤（<15分钟）
        "source": "中国城市规划设计研究院《2025年中国主要城市通勤监测报告》",
        "year": 2024
    },
    "上海": {
        "one_way_average_commute_time": 45,
        "extreme_commute_ratio": 0.24,
        "happy_commute_ratio": 0.52,
        "source": "中国城市规划设计研究院《2025年中国主要城市通勤监测报告》",
        "year": 2024
    },
    "深圳": {
        "one_way_average_commute_time": 38,
        "extreme_commute_ratio": 0.18,
        "happy_commute_ratio": 0.61,
        "source": "中国城市规划设计研究院《2025年中国主要城市通勤监测报告》",
        "year": 2024
    },
    "广州": {
        "one_way_average_commute_time": 42,
        "extreme_commute_ratio": 0.21,
        "happy_commute_ratio": 0.55,
        "source": "中国城市规划设计研究院《2025年中国主要城市通勤监测报告》",
        "year": 2024
    },
    "杭州": {
        "one_way_average_commute_time": 36,
        "extreme_commute_ratio": 0.15,
        "happy_commute_ratio": 0.64,
        "source": "中国城市规划设计研究院《2025年中国主要城市通勤监测报告》",
        "year": 2024
    },
    "南京": {
        "one_way_average_commute_time": 39,
        "extreme_commute_ratio": 0.19,
        "happy_commute_ratio": 0.59,
        "source": "中国城市规划设计研究院《2025年中国主要城市通勤监测报告》",
        "year": 2024
    },
    "成都": {
        "one_way_average_commute_time": 40,
        "extreme_commute_ratio": 0.20,
        "happy_commute_ratio": 0.57,
        "source": "中国城市规划设计研究院《2025年中国主要城市通勤监测报告》",
        "year": 2024
    },
    "武汉": {
        "one_way_average_commute_time": 41,
        "extreme_commute_ratio": 0.20,
        "happy_commute_ratio": 0.56,
        "source": "中国城市规划设计研究院《2025年中国主要城市通勤监测报告》",
        "year": 2024
    },
    "西安": {
        "one_way_average_commute_time": 37,
        "extreme_commute_ratio": 0.17,
        "happy_commute_ratio": 0.62,
        "source": "中国城市规划设计研究院《2025年中国主要城市通勤监测报告》",
        "year": 2024
    },
    "合肥": {
        "one_way_average_commute_time": 34,
        "extreme_commute_ratio": 0.14,
        "happy_commute_ratio": 0.67,
        "source": "中国城市规划设计研究院《2025年中国主要城市通勤监测报告》",
        "year": 2024
    },
    "青岛": {
        "one_way_average_commute_time": 35,
        "extreme_commute_ratio": 0.16,
        "happy_commute_ratio": 0.65,
        "source": "中国城市规划设计研究院《2025年中国主要城市通勤监测报告》",
        "year": 2024
    }
}


def generate_commute_json(city_name):
    """
    生成城市通勤JSON文件
    """
    data = COMMUTE_DATA.get(city_name, {})
    
    city_data = {
        "city": city_name,
        "year": data.get("year", 2024),
        "one_way_average_commute_time": data.get("one_way_average_commute_time", 0),
        "time_unit": "minutes",
        "commute_ratios": {
            "extreme_commute": data.get("extreme_commute_ratio", 0),
            "happy_commute": data.get("happy_commute_ratio", 0)
        },
        "source": data.get("source", "")
    }
    
    return city_data


def save_json_data(city_name, data):
    """
    保存JSON数据到文件
    """
    output_path = Path("../../public/cities") / city_name / "commute.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"已保存: {output_path}")
    return output_path


def process_all_cities():
    """
    处理所有城市的数据
    """
    print("开始处理各城市通勤数据...")
    
    for city_name in CITIES:
        print(f"\n处理 {city_name}...")
        try:
            data = generate_commute_json(city_name)
            save_json_data(city_name, data)
        except Exception as e:
            print(f"处理 {city_name} 时出错: {e}")
    
    print("\n所有城市通勤数据处理完成!")


if __name__ == "__main__":
    process_all_cities()
