#!/bin/bash

# 配置
THRESHOLD_LINES=500  # 行数阈值
THRESHOLD_FILES=1000 # 启用并行的文件数阈值
SILENT=false         # 静默模式（仅输出结果）
VERBOSE=false        # 详细模式

# 需要排除的目录（依赖、构建产物等）
EXCLUDE_DIRS=(
  "node_modules"
  "vendor"
  "dist"
  "build"
  ".git"
  "target"
  "bin"
  "obj"
  "out"
  "__pycache__"
  ".venv"
  "venv"
  "env"
  ".next"
  ".nuxt"
  "coverage"
)

# 处理命令行参数
while [[ $# -gt 0 ]]; do
  case "$1" in
  -s | --silent)
    SILENT=true
    VERBOSE=false
    shift
    ;;
  -v | --verbose)
    VERBOSE=true
    SILENT=false
    shift
    ;;
  -l | --lines)
    # 验证行数阈值为正整数
    if ! [[ "$2" =~ ^[0-9]+$ ]]; then
      echo "错误：行数阈值必须是正整数" >&2
      exit 1
    fi
    THRESHOLD_LINES="$2"
    shift 2
    ;;
  *)
    echo "错误：未知参数 $1" >&2
    echo "用法：$0 [选项]" >&2
    echo "  -s, --silent    仅输出结果，不显示状态信息" >&2
    echo "  -v, --verbose   显示详细处理过程" >&2
    echo "  -l, --lines N   设置行数阈值（默认：500，必须为正整数）" >&2
    exit 1
    ;;
  esac
done

# 定义需要检查的代码文件后缀
CODE_EXTENSIONS=(
  "go" "py" "js" "ts" "java" "cpp" "c" "h"
  "php" "rb" "rs" "vue" "html" "css" "scss" "sh"
)

# 日志函���
log_verbose() {
  if [ "$VERBOSE" = true ]; then
    echo "$1" >&2
  fi
}

# 检查是否为代码文件
is_code_file() {
  local file="$1"
  local extension="${file##*.}"

  for ext in "${CODE_EXTENSIONS[@]}"; do
    if [ "$extension" = "$ext" ]; then
      return 0
    fi
  done
  return 1
}

# 检查大文件的主函数
find_large_files() {
  local search_path="${1:-.}"
  local total_files=0
  local large_files=0
  local temp_file=$(mktemp)

  log_verbose "Scanning directory: $(pwd)"

  # 构建 find 排除参数
  local exclude_params=""
  for dir in "${EXCLUDE_DIRS[@]}"; do
    exclude_params="$exclude_params -name \"$dir\" -prune -o"
  done
  log_verbose "Excluding directories: ${EXCLUDE_DIRS[*]}"

  # 使用find命令查找所有代码文件并统计行数，排除依赖目录
  while IFS= read -r -d '' file; do
    if is_code_file "$file"; then
      ((total_files++))
      if [ "$VERBOSE" = true ] && [ $((total_files % 100)) -eq 0 ]; then
        log_verbose "Processed $total_files files..."
      fi

      # 使用wc -l统计行数
      local lines=$(wc -l < "$file" 2>/dev/null)
      if [ "$lines" -gt "$THRESHOLD_LINES" ]; then
        ((large_files++))
        echo "$file: $lines lines" >> "$temp_file"
        if [ "$VERBOSE" = true ]; then
          log_verbose "Found large file: $file ($lines lines)"
        fi
      fi
    fi
  done < <(eval "find \"$search_path\" $exclude_params -type f -print0 2>/dev/null")

  # 输出结果
  if [ "$SILENT" = false ]; then
    log_verbose "Total files scanned: $total_files"
    log_verbose "Files exceeding threshold: $large_files"
    if [ $large_files -gt 0 ]; then
      echo "=== Files exceeding $THRESHOLD_LINES lines ==="
    fi
  fi

  # 按行数排序输出结果
  if [ -f "$temp_file" ] && [ -s "$temp_file" ]; then
    sort -t: -k2 -nr "$temp_file"
  fi

  # 清理临时文件
  rm -f "$temp_file"

  if [ "$SILENT" = false ]; then
    log_verbose "Scan completed"
  fi
}

# 主程序
main() {
  if [ "$SILENT" = false ]; then
    echo "Huge Code File Scanner"
    echo "Threshold: $THRESHOLD_LINES lines"
    echo "========================"
  fi

  find_large_files .
}

# 执行主程序
main
