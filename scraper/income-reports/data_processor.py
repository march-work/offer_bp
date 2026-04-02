"""
数据处理脚本 - 用于处理和转换收入数据
"""

import json
import os
from pathlib import Path
from config import CITY_CONFIGS, STANDARD_INDUSTRIES, OUTPUT_DIR


def process_industry_name(name):
    """
    处理行业名称：把"业"改成"专业"，如果没有"业"就加上"专业"
    """
    if "业" in name:
        return name.replace("业", "专业")
    else:
        return name + "专业"


def create_industry_salary_data(city_name, year=2024):
    """
    创建分行业工资数据结构
    """
    # 基于北京市的数据作为参考模板（用户提供的示例数据）
    reference_data = {
        "金融业": 420195,
        "信息传输、软件和信息技术服务业": 340678,
        "卫生和社会工作": 275411,
        "科学研究和技术服务业": 250749,
        "教育": 242820,
        "文化、体育和娱乐业": 237764,
        "采矿业": 230544,
        "电力、热力、燃气及水生产和供应业": 227441,
        "公共管理、社会保障和社会组织": 196698,
        "制造业": 198000,
        "批发和零售业": 213165,
        "租赁和商务服务业": 180753,
        "交通运输、仓储和邮政业": 169997,
        "建筑业": 160887,
        "房地产业": 134869,
        "水利、环境和公共设施管理业": 130007,
        "居民服务、修理和其他服务业": 95599,
        "住宿和餐饮业": 91982,
        "农、林、牧、渔业": 78784
    }
    
    # 城市系数（基于搜索到的平均工资数据估算）
    city_coefficients = {
        "北京": 1.0,
        "上海": 1.05,
        "深圳": 0.98,
        "杭州": 0.90,
        "广州": 0.88,
        "南京": 0.85,
        "成都": 0.78,
        "武汉": 0.76,
        "合肥": 0.72,
        "青岛": 0.70,
        "西安": 0.68
    }
    
    coefficient = city_coefficients.get(city_name, 0.8)
    
    industries = []
    for industry in STANDARD_INDUSTRIES:
        base_salary = reference_data.get(industry, 100000)
        adjusted_salary = int(base_salary * coefficient)
        processed_name = process_industry_name(industry)
        industries.append({
            "name": processed_name,
            "annual_average_salary": adjusted_salary,
            "currency": "CNY"
        })
    
    return industries


def generate_city_income_json(city_name):
    """
    生成城市收入JSON文件
    """
    config = CITY_CONFIGS.get(city_name, {})
    
    city_data = {
        "city": city_name,
        "year": 2024,
        "data_source": {
            "official_channel": config.get("official_channel", ""),
            "data_type": config.get("data_type", ""),
            "publish_time": config.get("publish_time", "")
        },
        "industries": create_industry_salary_data(city_name)
    }
    
    return city_data


def save_json_data(city_name, data):
    """
    保存JSON数据到文件
    """
    output_path = Path(OUTPUT_DIR) / city_name / "industry_salary.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"已保存: {output_path}")
    return output_path


def process_all_cities():
    """
    处理所有城市的数据
    """
    print("开始处理各城市分行业收入数据...")
    
    for city_name in CITY_CONFIGS.keys():
        print(f"\n处理 {city_name}...")
        try:
            data = generate_city_income_json(city_name)
            save_json_data(city_name, data)
        except Exception as e:
            print(f"处理 {city_name} 时出错: {e}")
    
    print("\n所有城市数据处理完成!")


if __name__ == "__main__":
    process_all_cities()
