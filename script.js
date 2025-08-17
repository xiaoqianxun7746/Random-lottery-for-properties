// 楼盘数据存储
let properties = [];
let lotteryHistory = [];

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    renderProperties();
    renderHistory();
    
    // 添加回车键支持
    document.getElementById('propertyName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addProperty();
        }
    });
    
    document.getElementById('propertyWeight').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addProperty();
        }
    });
});

// 添加楼盘
function addProperty() {
    const nameInput = document.getElementById('propertyName');
    const weightInput = document.getElementById('propertyWeight');
    
    const name = nameInput.value.trim();
    const weight = parseFloat(weightInput.value) || 1;
    
    if (!name) {
        alert('请输入楼盘名称！');
        nameInput.focus();
        return;
    }
    
    if (weight <= 0) {
        alert('权重必须大于0！');
        weightInput.focus();
        return;
    }
    
    // 检查是否已存在同名楼盘
    if (properties.some(p => p.name === name)) {
        alert('该楼盘名称已存在！');
        nameInput.focus();
        return;
    }
    
    // 添加新楼盘
    const newProperty = {
        id: Date.now(),
        name: name,
        weight: weight
    };
    
    properties.push(newProperty);
    
    // 清空输入框
    nameInput.value = '';
    weightInput.value = '1';
    nameInput.focus();
    
    // 更新显示和保存数据
    renderProperties();
    saveToLocalStorage();
    
    // 显示成功提示
    showNotification(`楼盘"${name}"添加成功！`, 'success');
}

// 删除楼盘
function deleteProperty(id) {
    if (confirm('确定要删除这个楼盘吗？')) {
        properties = properties.filter(p => p.id !== id);
        renderProperties();
        saveToLocalStorage();
        showNotification('楼盘删除成功！', 'success');
    }
}

// 编辑楼盘权重
function editProperty(id) {
    const property = properties.find(p => p.id === id);
    if (!property) return;
    
    const newWeight = prompt(`请输入"${property.name}"的新权重：`, property.weight);
    
    if (newWeight === null) return; // 用户取消
    
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) {
        alert('权重必须是大于0的数字！');
        return;
    }
    
    property.weight = weight;
    renderProperties();
    saveToLocalStorage();
    showNotification('权重修改成功！', 'success');
}

// 渲染楼盘列表
function renderProperties() {
    const container = document.getElementById('propertiesList');
    
    if (properties.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #718096; padding: 20px;">
                <p>暂无楼盘，请先添加楼盘</p>
            </div>
        `;
        return;
    }
    
    // 计算总权重和概率
    const totalWeight = properties.reduce((sum, p) => sum + p.weight, 0);
    
    container.innerHTML = properties.map(property => {
        const probability = ((property.weight / totalWeight) * 100).toFixed(1);
        return `
            <div class="property-item">
                <div class="property-info">
                    <div class="property-name">${escapeHtml(property.name)}</div>
                    <div class="property-weight">权重: ${property.weight}</div>
                    <div class="property-probability">概率: ${probability}%</div>
                </div>
                <div class="property-actions">
                    <button class="edit-btn" onclick="editProperty(${property.id})">编辑</button>
                    <button class="delete-btn" onclick="deleteProperty(${property.id})">删除</button>
                </div>
            </div>
        `;
    }).join('');
}

// 开始抽签
function startLottery() {
    if (properties.length === 0) {
        alert('请先添加楼盘！');
        return;
    }
    
    const lotteryBtn = document.getElementById('lotteryBtn');
    const resultDisplay = document.getElementById('resultDisplay');
    
    // 禁用按钮，显示抽签动画
    lotteryBtn.disabled = true;
    lotteryBtn.innerHTML = '<i class="fas fa-dice"></i> 抽签中...';
    
    // 创建楼盘名字列表用于滚动
    const propertyNames = properties.map(p => p.name);
    // 为了更好的滚动效果，重复楼盘名字
    const scrollNames = [...propertyNames, ...propertyNames, ...propertyNames];
    
    // 显示楼盘滚动动画
    resultDisplay.innerHTML = `
        <div class="lottery-scroll-container">
            <div class="scroll-header">
                <i class="fas fa-dice"></i>
                <span>正在随机抽取楼盘...</span>
            </div>
            <div class="scroll-window">
                <div class="scroll-list" id="scrollList">
                    ${scrollNames.map(name => `<div class="scroll-item">${escapeHtml(name)}</div>`).join('')}
                </div>
                <div class="scroll-indicator"></div>
            </div>
            <div class="scroll-footer">
                <div class="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    `;
    
    // 楼盘滚动动画样式已在全局定义，无需重复添加
    
    // 延迟显示结果，增加悬念
    setTimeout(() => {
        const winner = performWeightedLottery();
        displayResult(winner);
        
        // 恢复按钮状态
        lotteryBtn.disabled = false;
        lotteryBtn.innerHTML = '<i class="fas fa-bullseye"></i> 开始抽签';
        
        // 记录历史
        addToHistory(winner);
        
    }, 1500); // 1.5秒的抽签动画
}

// 执行加权随机抽签
function performWeightedLottery() {
    const totalWeight = properties.reduce((sum, p) => sum + p.weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const property of properties) {
        currentWeight += property.weight;
        if (random <= currentWeight) {
            return property;
        }
    }
    
    // 理论上不应该到达这里，但作为备用
    return properties[properties.length - 1];
}

// 显示抽签结果
function displayResult(winner) {
    const resultDisplay = document.getElementById('resultDisplay');
    const resultArea = document.getElementById('resultArea');
    
    resultDisplay.className = 'result-display winner';
    resultDisplay.innerHTML = `
        <div>
            <span class="winner-emoji">🎉</span>
            <div class="winner-text">恭喜！</div>
            <div class="winner-text">${escapeHtml(winner.name)}</div>
            <div style="font-size: 1rem; color: #38a169; margin-top: 10px;">
                中签概率: ${((winner.weight / properties.reduce((sum, p) => sum + p.weight, 0)) * 100).toFixed(1)}%
            </div>
        </div>
    `;
    
    // 添加庆祝效果
    createConfetti();
}

// 创建庆祝彩带效果
function createConfetti() {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * 100}vw;
                top: -10px;
                z-index: 1000;
                border-radius: 50%;
                pointer-events: none;
                animation: confetti-fall 3s linear forwards;
            `;
            
            document.body.appendChild(confetti);
            
            setTimeout(() => {
                confetti.remove();
            }, 3000);
        }, i * 50);
    }
    
    // 添加彩带下落动画
    if (!document.getElementById('confetti-style')) {
        const style = document.createElement('style');
        style.id = 'confetti-style';
        style.textContent = `
            @keyframes confetti-fall {
                to {
                    transform: translateY(100vh) rotate(720deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// 添加到历史记录
function addToHistory(winner) {
    const historyItem = {
        id: Date.now(),
        winner: winner.name,
        weight: winner.weight,
        probability: ((winner.weight / properties.reduce((sum, p) => sum + p.weight, 0)) * 100).toFixed(1),
        timestamp: new Date()
    };
    
    lotteryHistory.unshift(historyItem); // 添加到开头
    
    // 限制历史记录数量
    if (lotteryHistory.length > 100) {
        lotteryHistory = lotteryHistory.slice(0, 100);
    }
    
    renderHistory();
    saveToLocalStorage();
}

// 渲染历史记录
function renderHistory() {
    const container = document.getElementById('historyList');
    
    if (lotteryHistory.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #718096; padding: 20px;">
                <p>暂无抽签记录</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = lotteryHistory.map(item => `
        <div class="history-item">
            <div class="history-winner">
                🏆 ${escapeHtml(item.winner)} 
                <span style="font-size: 0.9rem; color: #38a169;">(${item.probability}%)</span>
            </div>
            <div class="history-time">${formatDateTime(item.timestamp)}</div>
        </div>
    `).join('');
}

// 清空历史记录
function clearHistory() {
    if (lotteryHistory.length === 0) {
        alert('暂无历史记录！');
        return;
    }
    
    if (confirm('确定要清空所有历史记录吗？')) {
        lotteryHistory = [];
        renderHistory();
        saveToLocalStorage();
        showNotification('历史记录已清空！', 'success');
    }
}

// 导出历史记录
function exportHistory() {
    if (lotteryHistory.length === 0) {
        alert('暂无历史记录可导出！');
        return;
    }
    
    const csvContent = [
        ['序号', '中签楼盘', '权重', '概率', '抽签时间'],
        ...lotteryHistory.map((item, index) => [
            lotteryHistory.length - index,
            item.winner,
            item.weight,
            item.probability + '%',
            formatDateTime(item.timestamp)
        ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `楼盘抽签记录_${formatDate(new Date())}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('历史记录导出成功！', 'success');
}

// 重置所有数据
function resetAll() {
    if (properties.length === 0 && lotteryHistory.length === 0) {
        alert('暂无数据需要重置！');
        return;
    }
    
    if (confirm('确定要重置所有数据吗？这将清空所有楼盘和历史记录！')) {
        properties = [];
        lotteryHistory = [];
        
        renderProperties();
        renderHistory();
        saveToLocalStorage();
        
        // 重置结果显示
        const resultDisplay = document.getElementById('resultDisplay');
        resultDisplay.className = 'result-display';
        resultDisplay.innerHTML = '<p>点击"开始抽签"进行随机抽取</p>';
        
        showNotification('所有数据已重置！', 'success');
    }
}

// 本地存储相关函数
function saveToLocalStorage() {
    try {
        localStorage.setItem('lotteryProperties', JSON.stringify(properties));
        localStorage.setItem('lotteryHistory', JSON.stringify(lotteryHistory));
    } catch (error) {
        console.error('保存数据失败:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const savedProperties = localStorage.getItem('lotteryProperties');
        const savedHistory = localStorage.getItem('lotteryHistory');
        
        if (savedProperties) {
            properties = JSON.parse(savedProperties);
        }
        
        if (savedHistory) {
            lotteryHistory = JSON.parse(savedHistory).map(item => ({
                ...item,
                timestamp: new Date(item.timestamp)
            }));
        }
    } catch (error) {
        console.error('加载数据失败:', error);
        properties = [];
        lotteryHistory = [];
    }
}

// 工具函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDateTime(date) {
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    // 根据类型设置颜色
    const colors = {
        success: '#48bb78',
        error: '#f56565',
        warning: '#ed8936',
        info: '#4299e1'
    };
    
    notification.style.background = colors[type] || colors.info;
    notification.textContent = message;
    
    // 添加滑入动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }, 300);
    }, 3000);
}

// 概率设置相关函数（高级功能）
function openProbabilityModal() {
    if (properties.length === 0) {
        alert('请先添加楼盘！');
        return;
    }
    
    const modal = document.getElementById('probabilityModal');
    const settingsContainer = document.getElementById('probabilitySettings');
    
    // 生成概率设置界面
    settingsContainer.innerHTML = properties.map(property => `
        <div class="probability-item">
            <span>${escapeHtml(property.name)}</span>
            <input type="number" 
                   id="weight_${property.id}" 
                   value="${property.weight}" 
                   min="0.1" 
                   max="10" 
                   step="0.1">
        </div>
    `).join('');
    
    modal.style.display = 'block';
}

function closeProbabilityModal() {
    document.getElementById('probabilityModal').style.display = 'none';
}

function saveProbabilities() {
    let hasChanges = false;
    
    properties.forEach(property => {
        const input = document.getElementById(`weight_${property.id}`);
        const newWeight = parseFloat(input.value);
        
        if (!isNaN(newWeight) && newWeight > 0 && newWeight !== property.weight) {
            property.weight = newWeight;
            hasChanges = true;
        }
    });
    
    if (hasChanges) {
        renderProperties();
        saveToLocalStorage();
        showNotification('概率设置已保存！', 'success');
    }
    
    closeProbabilityModal();
}

function resetProbabilities() {
    if (confirm('确定要将所有楼盘的权重重置为1吗？')) {
        properties.forEach(property => {
            property.weight = 1;
        });
        
        renderProperties();
        saveToLocalStorage();
        closeProbabilityModal();
        showNotification('概率已重置为均等！', 'success');
    }
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('probabilityModal');
    if (event.target === modal) {
        closeProbabilityModal();
    }
}

// 添加一些示例数据（可选）
function addSampleData() {
    if (properties.length > 0) return;
    
    const sampleProperties = [
        { name: '绿城桂花园', weight: 1 },
        { name: '万科西湖', weight: 1 },
        { name: '保利天悦', weight: 1 },
        { name: '融创江南府', weight: 1 }
    ];
    
    sampleProperties.forEach(prop => {
        properties.push({
            id: Date.now() + Math.random(),
            name: prop.name,
            weight: prop.weight
        });
    });
    
    renderProperties();
    saveToLocalStorage();
}

// 键盘快捷键支持
document.addEventListener('keydown', function(e) {
    // Ctrl + Enter 开始抽签
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        startLottery();
    }
    
    // Escape 关闭模态框
    if (e.key === 'Escape') {
        closeProbabilityModal();
    }
});

// 在页面底部添加概率设置按钮（可选功能）
document.addEventListener('DOMContentLoaded', function() {
    // 可以在这里添加更多初始化代码
    console.log('楼盘随机抽签系统已加载完成');
    
    // 添加楼盘滚动容器样式
    const style = document.createElement('style');
    style.textContent = `
        .lottery-scroll-container {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            box-sizing: border-box;
            padding: 30px;
        }
    `;
    document.head.appendChild(style);
});