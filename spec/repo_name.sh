#!/bin/bash

# 检测指定目录下的项目类型并提取项目名称
# 用法: ./repo_name.sh [路径]

# 获取目标路径，默认为当前目录
TARGET_DIR="${1:-.}"

# 检查路径是否存在
if [ ! -d "$TARGET_DIR" ]; then
    echo "错误: 路径 '$TARGET_DIR' 不存在"
    exit 1
fi

# 切换到目标目录
cd "$TARGET_DIR" || exit 1

PROJECT_NAME=""
PROJECT_TYPE=""

# 检测 Node.js 项目 (package.json)
if [ -f "package.json" ]; then
    # 检测是否有 tsconfig.json 来区分 TypeScript 和 JavaScript
    if [ -f "tsconfig.json" ]; then
        PROJECT_TYPE="typescript"
    else
        PROJECT_TYPE="nodejs"
    fi
    # 提取 name 字段，去除引号和逗号
    PROJECT_NAME=$(grep -m 1 '"name"' package.json | sed 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

# 检测 Go 项目 (go.mod)
elif [ -f "go.mod" ]; then
    PROJECT_TYPE="golang"
    # 提取 module 名称
    PROJECT_NAME=$(head -1 go.mod | sed 's/module[[:space:]]\+//')

# 检测 Java/Maven 项目 (pom.xml)
elif [ -f "pom.xml" ]; then
    PROJECT_TYPE="java"
    # 提取 artifactId
    PROJECT_NAME=$(grep -m 1 '<artifactId>' pom.xml | sed 's/.*<artifactId>\([^<]*\)<\/artifactId>.*/\1/')

# 检测 Python 项目 (setup.py 或 pyproject.toml)
elif [ -f "setup.py" ] || [ -f "pyproject.toml" ]; then
    PROJECT_TYPE="python"
    # 优先从 pyproject.toml 提取
    if [ -f "pyproject.toml" ]; then
        PROJECT_NAME=$(grep -m 1 'name = ' pyproject.toml | sed 's/.*name[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/')
    # 从 setup.py 提取
    elif [ -f "setup.py" ]; then
        PROJECT_NAME=$(grep -m 1 'name=' setup.py | sed 's/.*name[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/')
    fi

# 检测 Rust 项目 (Cargo.toml)
elif [ -f "Cargo.toml" ]; then
    PROJECT_TYPE="rust"
    # 提取 package name
    PROJECT_NAME=$(grep -m 1 '^name = ' Cargo.toml | sed 's/.*name[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/')

fi

# 输出结果 (JSON 格式)
if [ -n "$PROJECT_NAME" ]; then
    echo "{\"language\": \"$PROJECT_TYPE\", \"repo_name\": \"$PROJECT_NAME\"}"
else
    echo "未在 '$TARGET_DIR' 检测到支持的项目配置文件 (package.json, go.mod, pom.xml, setup.py, pyproject.toml, Cargo.toml)" >&2
    exit 1
fi
