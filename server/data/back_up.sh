#!/bin/bash

# 备份脚本 - 将当前目录文件压缩为zip文件
# 作者: 自动生成
# 日期: $(date +%Y-%m-%d)

# 获取当前脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 当前目录就是要备份的目录
CURRENT_DIR="$SCRIPT_DIR"

# 获取当前目录名称（用于命名zip文件）
CURRENT_DIR_NAME="$(basename "$CURRENT_DIR")"

# 确保private目录存在
PRIVATE_DIR="$SCRIPT_DIR/private"
if [ ! -d "$PRIVATE_DIR" ]; then
    echo "创建private目录: $PRIVATE_DIR"
    mkdir -p "$PRIVATE_DIR"
fi

# 生成带时间戳的备份文件名
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${CURRENT_DIR_NAME}_backup_${TIMESTAMP}.zip"

# 备份文件的完整路径
BACKUP_PATH="$PRIVATE_DIR/$BACKUP_NAME"

echo "开始备份..."
echo "源目录: $CURRENT_DIR"
echo "备份文件: $BACKUP_PATH"

# 检查zip命令是否可用
if ! command -v zip &> /dev/null; then
    echo "错误: 未找到zip命令，请先安装zip工具"
    echo "Ubuntu/Debian: sudo apt-get install zip"
    echo "CentOS/RHEL: sudo yum install zip"
    exit 1
fi

# 切换到当前目录的父目录，这样可以包含整个当前目录结构
cd "$(dirname "$CURRENT_DIR")"

# 创建zip备份，排除private目录和脚本自身以避免递归备份
echo "正在压缩文件..."
zip -r "$BACKUP_PATH" "$(basename "$CURRENT_DIR")" \
    -x "$(basename "$CURRENT_DIR")/private/*" \
    -x "$(basename "$CURRENT_DIR")/back_up.sh" \
    -x "*.tmp" "*.log" ".git/*" "node_modules/*" "__pycache__/*" "*.pyc"

# 检查备份是否成功
if [ $? -eq 0 ]; then
    echo "备份成功完成！"
    echo "备份文件: $BACKUP_PATH"
    echo "文件大小: $(du -h "$BACKUP_PATH" | cut -f1)"
    
    # 显示备份文件内容概览
    echo ""
    echo "备份内容概览:"
    zip -sf "$BACKUP_PATH" | head -20
    
    # 如果文件很多，显示总数
    TOTAL_FILES=$(zip -sf "$BACKUP_PATH" | wc -l)
    if [ $TOTAL_FILES -gt 20 ]; then
        echo "... 还有 $((TOTAL_FILES - 20)) 个文件"
    fi
    
else
    echo "备份失败！"
    exit 1
fi

echo ""
echo "备份完成！"
