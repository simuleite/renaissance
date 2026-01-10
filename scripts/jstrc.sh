#!/bin/bash

# ==================== jstrc - JSON Structure Checker ====================
# 功能：检查和提取JSON文件的结构信息
# 使用方式：
#   jstrc parse <json-file>              - 解析整个JSON结构
#   jstrc '<json-path>' <json-file>      - 检查指定路径的类型
#   jstrc paths <json-file>              - 列出所有JSON路径
# 注意：JSON路径必须用单引号包裹！
#
# 日志开关：
#   脚本内置调试日志功能，可通过修改 LOG_ENABLED 常量控制：
#     LOG_ENABLED=true  启用日志，记录到 /tmp/jstrc-debug.log
#     LOG_ENABLED=false 关闭日志（默认）

# ==================== 调试日志函数 ====================
DEBUG_LOG="/tmp/jstrc-debug.log"

debug_log() {
  if [[ "$LOG_ENABLED" == "true" ]]; then
    local msg="$1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $msg" >> "$DEBUG_LOG"
  fi
}

debug_log "=== jstrc.sh 开始执行 ==="

# ==================== 常量定义 ====================
readonly JSTRC_VERSION="2.0.0"
readonly REQUIRED_JQ_VERSION="1.5"
readonly LOG_ENABLED=false  # 日志开关：true=启用日志，false=关闭日志

debug_log "常量定义完成: VERSION=$JSTRC_VERSION, LOG_ENABLED=$LOG_ENABLED"

# ==================== 函数定义 ====================

# 显示帮助信息
show_help() {
  cat << 'EOF'
jstrc - JSON Structure Checker v2.0.0

用法：
  jstrc parse <json-file>                解析整个JSON结构为类型树
  jstrc '<json-path>' <json-file>        检查指定路径的字段类型
  jstrc paths <json-file>                列出所有JSON路径
  jstrc search <pattern> <json-file>     搜索包含特定模式的value (默认)
  jstrc search <pattern> <json-file> -k  搜索包含特定模式的key
  jstrc search <pattern> <json-file> -b  同时搜索key和value

示例：
  jstrc parse data.json                  查看完整结构
  jstrc '.users[]' data.json             查看users数组元素类型
  jstrc '.metadata.version' data.json    查看指定字段类型
  jstrc paths data.json                  列出所有路径
  jstrc search "user" data.json          搜索包含"user"的value
  jstrc search "name" data.json -k       搜索包含"name"的key
  jstrc search "id" data.json -b         同时搜索key和value

重要：JSON路径必须用单引号包裹！
  正确: jstrc '.users[]' data.json
  错误: jstrc .users[] data.json

搜索选项：
  -k, --keys-only:   只搜索key
  -v, --values-only: 只搜索value (默认)
  -b, --both:        同时搜索key和value

EOF
}

# 检查jq是否安装并验证版本
check_prerequisites() {
  debug_log "检查前置条件: jq是否安装"

  if ! command -v jq &>/dev/null; then
    echo "错误：未找到 jq 工具" >&2
    echo "" >&2
    echo "请先安装 jq：" >&2
    echo "  Ubuntu/Debian: sudo apt install jq" >&2
    echo "  macOS: brew install jq" >&2
    echo "  CentOS/RHEL: sudo yum install jq" >&2
    return 1
  fi

  local jq_version=$(jq --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+')
  debug_log "jq版本: $jq_version"

  return 0
}

# 检查文件是否存在且可读
check_file_exists() {
  local file_path="$1"

  debug_log "检查文件: $file_path"

  if [[ ! -e "$file_path" ]]; then
    echo "错误：文件 '$file_path' 不存在" >&2
    return 1
  fi

  if [[ ! -f "$file_path" ]]; then
    echo "错误：'$file_path' 不是文件" >&2
    return 1
  fi

  if [[ ! -r "$file_path" ]]; then
    echo "错误：文件 '$file_path' 不可读" >&2
    return 1
  fi

  return 0
}

# 验证JSON格式是否有效
validate_json() {
  local file_path="$1"

  debug_log "验证JSON格式: $file_path"

  if ! jq empty "$file_path" 2>/dev/null; then
    echo "错误：'$file_path' 不是有效的JSON文件" >&2
    echo "" >&2
    echo "提示：可以使用 jq 查看详细错误：" >&2
    echo "  jq '.' '$file_path'" >&2
    return 1
  fi

  debug_log "JSON格式验证通过"
  return 0
}

# 生成递归类型解析的jq查询
generate_walk_type_query() {
  cat << 'EOF'
def walk_type:
  if type == "object" then
    map_values(walk_type)
  elif type == "array" then
    if length == 0 then
      "array[]"
    else
      # 对于非空数组，取第一个元素分析其结构
      { "array[i]": (.[0] | walk_type) }
    end
  else
    # 基本类型直接返回类型名
    type
  end;

walk_type
EOF
}

# 生成路径类型提取的jq查询
generate_type_query() {
  local json_path="$1"

  debug_log "生成类型查询: path=$json_path"

  cat << EOF
$json_path
| if type == "array" then
    # 处理数组：如果为空返回array[]，否则分析第一个元素
    if length == 0 then
      "array[]"
    elif (.[0] | type) == "object" then
      # 数组元素是对象，返回其字段类型
      .[0] | map_values(type)
    else
      # 数组元素是基本类型，返回类型名
      .[0] | type
    end
  elif type == "object" then
    # 处理对象：返回每个字段的类型
    map_values(type)
  else
    # 基本类型
    {value: type}
  end
EOF
}

# 生成路径列表的jq查询
generate_paths_query() {
  cat << 'EOF'
def paths_with_types:
  path(..) as $p
  | select($p | length > 0)
  | {
      ($p | map(if type == "string" then . else "[i]" end) | join(".")): (getpath($p) | type)
    };

[paths_with_types] | add
EOF
}

# 生成搜索功能的jq查询
generate_search_query() {
  local search_pattern="$1"
  local search_keys="$2"
  local search_values="$3"

  debug_log "生成搜索查询: pattern=$search_pattern, keys=$search_keys, values=$search_values"

  # 根据参数生成不同的查询
  local key_section=""
  local value_section=""

  if [[ "$search_keys" == "true" ]]; then
    key_section='
  def search_in_paths:
    def paths_with_types:
      path(..) as $p
      | select($p | length > 0)
      | {
          ($p | map(if type == "string" then . else "[i]" end) | join(".")): (getpath($p) | type)
        };

    [paths_with_types] | add | to_entries | .[] | select(.key | contains("'
    key_section+="$search_pattern"
    key_section+='")) | {(.key): .value};
'
  fi

  if [[ "$search_values" == "true" ]]; then
    value_section='
  def search_in_values:
    # 搜索字符串值中包含pattern的内容
    path(..) as $p
    | getpath($p) as $v
    | select($v | type == "string")
    | select($v | contains("'
    value_section+="$search_pattern"
    value_section+='"))
    | {($p | map(if type == "string" then . else "[i]" end) | join(".")): $v};
'
  fi

  # 构建输出对象
  local output_obj="{"
  local first=true

  if [[ "$search_keys" == "true" ]]; then
    output_obj+="key_matches: if [search_in_paths] | length > 0 then [search_in_paths] | add else {} end"
    first=false
  fi

  if [[ "$search_values" == "true" ]]; then
    if [[ "$first" == "false" ]]; then
      output_obj+=", "
    fi
    output_obj+="value_matches: if [search_in_values] | length > 0 then [search_in_values] | add else {} end"
  fi

  output_obj+="}"

  cat << EOF
# 搜索key路径和value内容
$key_section
$value_section

$output_obj
EOF
}

# 解析完整JSON结构（parse子命令）
parse_full_structure() {
  local json_file="$1"

  debug_log "执行完整结构解析: $json_file"

  local jq_query=$(generate_walk_type_query)

  if jq "$jq_query" "$json_file" 2>/dev/null; then
    debug_log "结构解析成功"
    return 0
  else
    local error_msg=$(jq "$jq_query" "$json_file" 2>&1)
    debug_log "结构解析失败: $error_msg"
    echo "错误：JSON解析失败" >&2
    echo "$error_msg" >&2
    return 1
  fi
}

# 提取指定路径的类型（默认模式）
extract_path_types() {
  local json_path="$1"
  local json_file="$2"

  debug_log "提取路径类型: path=$json_path, file=$json_file"

  # 验证路径格式
  if [[ ! "$json_path" =~ ^\. ]]; then
    echo "错误：JSON路径必须以 '.' 开头" >&2
    echo "" >&2
    echo "正确示例：" >&2
    echo "  .field" >&2
    echo "  .array[]" >&2
    echo "  .nested.field" >&2
    return 1
  fi

  # 先验证路径是否存在（检查是否为null或错误）
  local path_check=$(jq "$json_path" "$json_file" 2>/dev/null)

  if [[ $? -ne 0 ]] || [[ "$path_check" == "null" ]]; then
    echo "错误：JSON路径 '$json_path' 不存在" >&2
    echo "" >&2
    echo "提示：可以使用以下命令查看可用路径：" >&2
    echo "  jstrc paths '$json_file'" >&2
    return 1
  fi

  local jq_query=$(generate_type_query "$json_path")

  if jq "$jq_query" "$json_file" 2>/dev/null; then
    debug_log "路径类型提取成功"
    return 0
  else
    local error_msg=$(jq "$jq_query" "$json_file" 2>&1)
    debug_log "路径类型提取失败: $error_msg"
    echo "错误：类型提取失败" >&2
    echo "$error_msg" >&2
    return 1
  fi
}

# 列出所有JSON路径（paths子命令）
list_all_paths() {
  local json_file="$1"

  debug_log "列出所有路径: $json_file"

  local jq_query=$(generate_paths_query)

  if jq "$jq_query" "$json_file" 2>/dev/null; then
    debug_log "路径列表生成成功"
    return 0
  else
    local error_msg=$(jq "$jq_query" "$json_file" 2>&1)
    debug_log "路径列表生成失败: $error_msg"
    echo "错误：路径列表生成失败" >&2
    echo "$error_msg" >&2
    return 1
  fi
}

# 搜索JSON中的key和value（search子命令）
# 支持参数：
#   -k 或 --keys-only: 只搜索key
#   -v 或 --values-only: 只搜索value (默认)
#   -b 或 --both: 同时搜索key和value
search_json() {
  local search_pattern="$1"
  local json_file="$2"
  local search_option="$3"
  local search_keys=false
  local search_values=true  # 默认只搜索value

  # 处理可选参数
  if [[ -n "$search_option" ]]; then
    case "$search_option" in
      -k|--keys-only)
        search_keys=true
        search_values=false
        ;;
      -v|--values-only)
        search_keys=false
        search_values=true
        ;;
      -b|--both)
        search_keys=true
        search_values=true
        ;;
      *)
        echo "错误：未知的搜索参数 '$search_option'" >&2
        echo "" >&2
        echo "可用参数：" >&2
        echo "  -k, --keys-only: 只搜索key" >&2
        echo "  -v, --values-only: 只搜索value (默认)" >&2
        echo "  -b, --both: 同时搜索key和value" >&2
        return 1
        ;;
    esac
  fi

  debug_log "搜索JSON: pattern=$search_pattern, file=$json_file, keys=$search_keys, values=$search_values"

  local jq_query=$(generate_search_query "$search_pattern" "$search_keys" "$search_values")

  if jq "$jq_query" "$json_file" 2>/dev/null; then
    debug_log "搜索完成"
    return 0
  else
    local error_msg=$(jq "$jq_query" "$json_file" 2>&1)
    debug_log "搜索失败: $error_msg"
    echo "错误：搜索失败" >&2
    echo "$error_msg" >&2
    return 1
  fi
}

# 验证参数
validate_args() {
  debug_log "验证参数: $@"

  # 无参数时显示帮助
  if [[ $# -eq 0 ]]; then
    show_help
    return 1
  fi

  # 帮助参数
  if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    show_help
    return 1
  fi

  # 版本参数
  if [[ "$1" == "-v" ]] || [[ "$1" == "--version" ]]; then
    echo "jstrc version $JSTRC_VERSION"
    return 1
  fi

  return 0
}

# ==================== 主逻辑 ====================
main() {
  debug_log "main函数开始，参数: $@"

  # 参数验证
  if ! validate_args "$@"; then
    debug_log "参数验证失败或显示帮助"
    exit 1
  fi

  # 检查前置条件
  if ! check_prerequisites; then
    debug_log "前置条件检查失败"
    exit 1
  fi

  local action="$1"
  local json_file=""

  # 判断命令模式
  if [[ "$action" == "parse" ]]; then
    # parse子命令: jstrc parse <file>
    if [[ $# -ne 2 ]]; then
      echo "错误：parse命令需要1个参数" >&2
      echo "" >&2
      echo "用法：jstrc parse <json-file>" >&2
      exit 1
    fi
    json_file="$2"

  elif [[ "$action" == "paths" ]]; then
    # paths子命令: jstrc paths <file>
    if [[ $# -ne 2 ]]; then
      echo "错误：paths命令需要1个参数" >&2
      echo "" >&2
      echo "用法：jstrc paths <json-file>" >&2
      exit 1
    fi
    json_file="$2"

  elif [[ "$action" == "search" ]]; then
    # search子命令: jstrc search <pattern> <file> [<-k|-v|-b>]
    if [[ $# -lt 3 ]]; then
      echo "错误：search命令需要至少2个参数" >&2
      echo "" >&2
      echo "用法：jstrc search <pattern> <json-file> [<-k|-v|-b>]" >&2
      echo "" >&2
      echo "选项：" >&2
      echo "  -k, --keys-only:   只搜索key" >&2
      echo "  -v, --values-only: 只搜索value (默认)" >&2
      echo "  -b, --both:        同时搜索key和value" >&2
      exit 1
    fi
    search_pattern="$2"
    json_file="$3"
    search_option="${4:-}"  # 可选参数，默认为空

  elif [[ "$action" =~ ^\. ]]; then
    # 路径模式: jstrc '<path>' <file>
    if [[ $# -ne 2 ]]; then
      echo "错误：路径模式需要2个参数" >&2
      echo "" >&2
      echo "用法：jstrc '<json-path>' <json-file>" >&2
      echo "" >&2
      echo "提示：JSON路径必须用单引号包裹！" >&2
      exit 1
    fi
    json_file="$2"

  else
    echo "错误：未知的命令或路径格式" >&2
    echo "" >&2
    echo "路径必须以 '.' 开头，或使用 parse/paths 子命令" >&2
    echo "" >&2
    echo "使用 'jstrc --help' 查看帮助" >&2
    exit 1
  fi

  debug_log "命令模式: action=$action, file=$json_file"

  # 处理标准输入
  local temp_file=""
  if [[ "$json_file" == "-" ]]; then
    debug_log "检测到标准输入，创建临时文件"
    temp_file=$(mktemp --suffix=.json)
    # 将stdin内容写入临时文件
    cat > "$temp_file"
    json_file="$temp_file"
    # 如果使用了 -h 或 --help，cat 后不会有参数传递给 main
    if [[ -z "$action" ]]; then
      show_help
      rm -f "$temp_file"
      exit 0
    fi
  fi

  # 文件验证
  if ! check_file_exists "$json_file"; then
    debug_log "文件检查失败"
    # 清理临时文件
    [[ -n "$temp_file" ]] && rm -f "$temp_file"
    exit 1
  fi

  if ! validate_json "$json_file"; then
    debug_log "JSON验证失败"
    # 清理临时文件
    [[ -n "$temp_file" ]] && rm -f "$temp_file"
    exit 1
  fi

  # 执行相应的操作
  local result=0

  case "$action" in
    "parse")
      parse_full_structure "$json_file"
      result=$?
      ;;
    "paths")
      list_all_paths "$json_file"
      result=$?
      ;;
    "search")
      search_json "$search_pattern" "$json_file" "$search_option"
      result=$?
      ;;
    *)
      # 路径模式
      extract_path_types "$action" "$json_file"
      result=$?
      ;;
  esac

  if [[ $result -eq 0 ]]; then
    debug_log "命令执行成功"
  else
    debug_log "命令执行失败: exit_code=$result"
  fi

  debug_log "=== jstrc.sh 执行完成 ==="

  exit $result
}

main "$@"
