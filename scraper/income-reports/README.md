# 收入报告爬虫

这个目录包含用于收集各城市分行业收入数据的脚本。

## 数据来源

数据来源包括：
- 各城市统计局官网
- 各城市人力资源和社会保障局官网
- 统计年鉴

## 目录结构

```
income-reports/
├── README.md
├── scraper.py          # 主爬虫脚本
├── data_processor.py   # 数据处理脚本
├── config.py           # 配置文件
└── requirements.txt    # 依赖包
```

## 使用说明

1. 安装依赖：`pip install -r requirements.txt`
2. 运行爬虫：`python scraper.py`
3. 处理数据：`python data_processor.py`
