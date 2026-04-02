"""
配置文件 - 城市官方渠道配置
"""

CITY_CONFIGS = {
    "北京": {
        "official_channel": "https://tjj.beijing.gov.cn/",
        "data_type": "分行业年平均工资",
        "publish_time": "2025年6月",
        "authority_level": "⭐⭐⭐ S级",
        "search_keywords": ["分行业年平均工资", "城镇单位就业人员平均工资"]
    },
    "上海": {
        "official_channel": "https://tjj.sh.gov.cn/tjgb/",
        "data_type": "统计公报（含产业数据）",
        "publish_time": "2026年3月",
        "authority_level": "⭐⭐⭐ S级",
        "search_keywords": ["统计公报", "分行业工资", "产业数据"]
    },
    "深圳": {
        "official_channel": "深圳市统计局官网",
        "data_type": "城镇单位年平均工资",
        "publish_time": "2025年7月",
        "authority_level": "⭐⭐⭐ S级",
        "search_keywords": ["城镇单位年平均工资", "分行业工资"]
    },
    "杭州": {
        "official_channel": "杭州市统计局官网",
        "data_type": "统计年鉴",
        "publish_time": "2025年12月",
        "authority_level": "⭐⭐⭐ S级",
        "search_keywords": ["统计年鉴", "分行业平均工资"]
    },
    "西安": {
        "official_channel": "西安市人社局官网",
        "data_type": "分职业薪酬调查",
        "publish_time": "2026年1月",
        "authority_level": "⭐⭐ A级",
        "search_keywords": ["分职业薪酬调查", "企业薪酬调查"]
    },
    "广州": {
        "official_channel": "广东省统计局官网",
        "data_type": "广东统计年鉴",
        "publish_time": "2025年12月",
        "authority_level": "⭐⭐⭐ S级",
        "search_keywords": ["广东统计年鉴", "分行业工资"]
    },
    "南京": {
        "official_channel": "江苏省统计局官网",
        "data_type": "江苏统计年鉴",
        "publish_time": "2025年12月",
        "authority_level": "⭐⭐⭐ S级",
        "search_keywords": ["江苏统计年鉴", "分行业平均工资"]
    },
    "成都": {
        "official_channel": "成都市统计局官网",
        "data_type": "成都统计年鉴",
        "publish_time": "2025年12月",
        "authority_level": "⭐⭐⭐ S级",
        "search_keywords": ["成都统计年鉴", "分行业工资"]
    },
    "武汉": {
        "official_channel": "湖北省统计局官网",
        "data_type": "湖北统计年鉴",
        "publish_time": "2025年12月",
        "authority_level": "⭐⭐⭐ S级",
        "search_keywords": ["湖北统计年鉴", "分行业平均工资"]
    },
    "合肥": {
        "official_channel": "安徽省统计局官网",
        "data_type": "安徽统计年鉴",
        "publish_time": "2025年12月",
        "authority_level": "⭐⭐⭐ S级",
        "search_keywords": ["安徽统计年鉴", "分行业工资"]
    },
    "青岛": {
        "official_channel": "青岛市统计局官网",
        "data_type": "青岛统计年鉴",
        "publish_time": "2025年12月",
        "authority_level": "⭐⭐⭐ S级",
        "search_keywords": ["青岛统计年鉴", "分行业平均工资"]
    }
}

# 标准行业分类
STANDARD_INDUSTRIES = [
    "金融业",
    "信息传输、软件和信息技术服务业",
    "卫生和社会工作",
    "科学研究和技术服务业",
    "教育",
    "文化、体育和娱乐业",
    "采矿业",
    "电力、热力、燃气及水生产和供应业",
    "公共管理、社会保障和社会组织",
    "农、林、牧、渔业",
    "住宿和餐饮业",
    "居民服务、修理和其他服务业",
    "水利、环境和公共设施管理业",
    "房地产业",
    "建筑业",
    "交通运输、仓储和邮政业",
    "租赁和商务服务业",
    "批发和零售业",
    "制造业"
]

# 输出目录
OUTPUT_DIR = "../../public/cities"
