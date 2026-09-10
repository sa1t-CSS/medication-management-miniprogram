# 微信小程序项目交接说明

## 1. 项目概况

本项目是一个医疗健康/用药管理类微信小程序，核心目标是帮助用户记录医嘱、添加用药计划、按日期查看用药安排，并预留药品拍照识别算法和蓝牙设备连接能力。

当前项目重点功能包括：

- 首页用药日历
- 早晨/中午/晚上用药计划入口
- 指定日期用药计划详情
- 医嘱记录管理
- 我的页面用药计划管理
- 拍照录入药品
- 紧急联系人保存与首页快捷拨打
- 蓝牙 BLE 设备搜索与连接
- 药品识别算法接入层
- 自定义底部导航栏

项目类型：微信小程序原生项目。

建议使用微信开发者工具打开项目根目录：

```text
<本地仓库目录>
```

## 2. 重要目录结构

```text
miniprogram-4
├─ app.js                         全局数据、提醒、页面刷新通知
├─ app.json                       页面注册、窗口配置、自定义 tabBar 配置
├─ app.wxss                       全局主题颜色、字体、基础卡片样式
├─ custom-tab-bar/                自定义底部导航栏
├─ docs/
│  ├─ algorithm-integration.md    算法老师接入说明
│  └─ project-handoff.md          当前交接说明
├─ pages/
│  ├─ index/                      首页、日历、今日提醒、紧急联系人浮动按钮
│  ├─ morning/                    早晨用药详情页
│  ├─ noon/                       中午用药详情页
│  ├─ evening/                    晚上用药详情页
│  ├─ pending/                    医嘱记录页
│  ├─ mine/                       我的、计划管理、拍照、蓝牙、紧急联系人
│  ├─ date-detail/                某一天完整用药详情
│  └─ smart/                      历史遗留页面，目前未在 app.json 页面列表中启用
└─ utils/
   ├─ util.js                     日期、日历提醒等通用工具
   ├─ storage.js                  存储工具
   └─ medicineAlgorithm.js        药品识别算法统一入口
```

## 3. 页面功能说明

### 3.1 首页 `pages/index`

首页负责展示：

- 用药日历
- 有用药计划日期的颜色标记
- 选中日期的早晨/中午/晚上计划数量
- 今日提醒
- 紧急联系人浮动按钮

核心逻辑：

- 日历从 `wx.getStorageSync('medicationPlans')` 读取按日期存储的计划。
- 点击某一天，如果该日有计划，会进入 `pages/date-detail/date-detail`。
- 点击早晨/中午/晚上卡片，会进入对应的 `morning/noon/evening` 页面，并携带当前选中日期。
- 添加计划后会保存 `lastPlanDate`，首页显示时自动选中刚添加计划的日期。

主要文件：

```text
pages/index/index.js
pages/index/index.wxml
pages/index/index.wxss
```

### 3.2 早晨/中午/晚上详情页

对应页面：

```text
pages/morning/
pages/noon/
pages/evening/
```

功能：

- 显示某一天对应时段需要服用的药品。
- 显示药品名称、剂量、默认时间、拍照图片。
- 三个页面使用不同颜色区分，避免视觉混淆。

数据来源：

```js
wx.getStorageSync('medicationPlans')[selectedDate][period]
```

其中 `period` 分别是：

```text
morning
noon
evening
```

当前也做了兜底：如果按日期数据为空，会从全局 `medicationData` 里读取同一时段数据，避免旧数据导致页面空白。

### 3.3 日期详情页 `pages/date-detail`

功能：

- 展示某一天完整的早晨、中午、晚上用药计划。
- 从首页点击有计划的日期进入。

数据来源：

```js
wx.getStorageSync('medicationPlans')[date]
```

### 3.4 医嘱记录页 `pages/pending`

功能：

- 添加医嘱记录。
- 选择服用频率。
- 选择服用时间。
- 填写备注信息。
- 保存历史医嘱。
- 将医嘱记录用于添加用药计划。
- 删除单条医嘱或清空全部医嘱。

数据存储：

```text
medicalRecords
pendingPlanDraft
```

其中 `pendingPlanDraft` 用于从医嘱页跳转到我的页面时，预填用药计划。

### 3.5 我的页面 `pages/mine`

这是当前功能最多的页面，包含：

- 紧急联系人
- 蓝牙设备连接
- 用药计划管理
- 拍照录入药品
- 药品识别算法调用
- 保存/编辑/删除早晨、中午、晚上用药计划

用药计划保存时会同时写入两套数据：

```text
medicationData      全局按早/中/晚分类，用于计划管理列表和总数据
medicationPlans     按日期存储，用于首页日历和详情页
```

保存逻辑重点：

- 选择早晨/中午/晚上后，不再额外要求用户选择具体时间。
- 默认时间：

```text
早晨 morning  -> 08:00
中午 noon     -> 12:00
晚上 evening  -> 20:00
```

- 保存后写入 `lastPlanDate`，首页回显时会自动选中刚添加计划的日期。

## 4. 核心数据结构

### 4.1 全局用药计划 `medicationData`

存储位置：

```js
wx.setStorageSync('medicationData', data)
```

结构：

```js
{
  morning: [
    {
      name: '药品名称',
      dose: '剂量',
      time: '08:00',
      date: '2026-05-21',
      duration: 7,
      imagePath: 'wxfile://...',
      algorithmResult: {}
    }
  ],
  noon: [],
  evening: []
}
```

### 4.2 按日期用药计划 `medicationPlans`

存储位置：

```js
wx.setStorageSync('medicationPlans', medicationPlans)
```

结构：

```js
{
  '2026-05-21': {
    morning: [
      {
        name: '药品名称',
        dose: '剂量',
        time: '08:00',
        imagePath: 'wxfile://...',
        algorithmResult: {}
      }
    ],
    noon: [],
    evening: []
  }
}
```

首页日历和日期详情主要依赖这个结构。

### 4.3 医嘱记录 `medicalRecords`

结构：

```js
[
  {
    id: 123,
    medicineName: '药物名称',
    frequency: '每日一次',
    times: ['早晨'],
    notes: '备注',
    createTime: '2026-05-21 10:30'
  }
]
```

### 4.4 紧急联系人 `emergencyContact`

结构：

```js
{
  name: '联系人',
  phone: '13800000000'
}
```

首页浮动按钮会读取该数据并调用：

```js
wx.makePhoneCall()
```

### 4.5 蓝牙设备 `bluetoothDevice`

结构：

```js
{
  deviceId: '设备 ID',
  name: '设备名称'
}
```

## 5. 算法接入说明

算法入口文件：

```text
utils/medicineAlgorithm.js
```

详细说明文件：

```text
docs/algorithm-integration.md
```

页面调用链：

```text
我的页面拍照 -> pages/mine/mine.js -> utils/medicineAlgorithm.js -> 算法实现
```

后续算法老师优先改：

```js
runImageRecognizer(imagePath, context)
```

推荐返回：

```js
{
  success: true,
  medicineName: '阿莫西林胶囊',
  dose: '1粒',
  confidence: 0.92,
  rawText: '识别原始文本',
  candidates: []
}
```

页面行为：

- 拍照后自动调用算法。
- 如果药品名称为空，识别成功后自动填入药品名称。
- 如果剂量为空，识别成功后自动填入剂量。
- 算法失败不会影响手动填写。
- 识别结果会保存到计划字段 `algorithmResult` 中。

注意：

- 小程序前端不适合直接运行大型模型。
- 推荐后续接入云函数、后端接口或轻量 OCR。
- 如果上传图片到服务器，需要配置微信小程序合法域名。
- 不要把长期 API 密钥写死在小程序前端。

## 6. 蓝牙功能说明

蓝牙模块位于：

```text
pages/mine/mine.js
pages/mine/mine.wxml
pages/mine/mine.wxss
```

当前支持：

- 打开蓝牙适配器
- 搜索附近 BLE 设备
- 展示设备列表
- 点击设备连接
- 保存上次连接设备
- 断开设备
- 监听连接断开状态

使用的微信 API：

```js
wx.openBluetoothAdapter()
wx.startBluetoothDevicesDiscovery()
wx.onBluetoothDeviceFound()
wx.createBLEConnection()
wx.getBLEDeviceServices()
wx.closeBLEConnection()
wx.onBLEConnectionStateChange()
```

注意：

- 当前只做通用 BLE 连接。
- 具体读取药盒数据、写入提醒数据，需要后续根据真实设备的 serviceId 和 characteristicId 再实现。
- 蓝牙功能必须真机测试，微信开发者工具内通常无法完整模拟。

## 7. UI 和交互风格

当前 UI 已按偏 iOS 风格调整：

- 全局浅灰背景。
- 卡片白色/浅色渐变。
- 按钮加强边框和对比度。
- 选中项使用深色背景和白色文字，保证明显可见。
- 首页日历有计划日期使用明显颜色标记。
- 早晨、中午、晚上详情页使用不同主题色区分。

全局样式主要在：

```text
app.wxss
```

页面样式分别在各页面 `.wxss` 文件中。

## 8. 已知注意事项

### 8.1 中文编码显示

项目中部分历史中文文案在 PowerShell 输出中可能显示为乱码。建议接手人员在微信开发者工具中逐页检查实际显示效果。

重点检查：

```text
app.json
pages/index/
pages/mine/
pages/pending/
custom-tab-bar/
```

如果微信开发者工具里也显示乱码，建议统一用 UTF-8 重新保存相关文件，并逐个替换页面文案。

### 8.2 `smart` 页面

`pages/smart/` 目前存在于目录中，但没有注册到 `app.json` 的页面列表里。它属于历史遗留页面，当前主流程不依赖它。

### 8.3 微信权限

当前涉及：

- 相机权限
- 蓝牙权限
- 日历能力，取决于微信和手机系统支持情况
- 拨打电话能力

其中：

- 相机用于拍照录入药品。
- 蓝牙用于连接 BLE 设备。
- 手机日历提醒不是所有环境都支持，失败时需要用户手动设置闹钟。

## 9. 推荐测试流程

交接后建议按以下顺序测试：

1. 打开微信开发者工具，导入项目根目录。
2. 检查首页是否正常显示日历和底部导航。
3. 进入“我的”，添加紧急联系人。
4. 回首页，检查紧急联系人浮动按钮是否出现，点击是否可拨号。
5. 进入“我的”，添加早晨用药计划。
6. 回首页，确认对应日期有颜色标记。
7. 点击早晨用药，确认能看到刚添加的计划。
8. 分别测试中午、晚上用药计划。
9. 测试拍照录入药品，确认照片能保存到计划中。
10. 测试首页日期详情页，确认某一天完整计划可查看。
11. 进入“医嘱”，添加医嘱记录。
12. 将医嘱记录用于添加计划，确认能跳转到“我的”并预填。
13. 删除医嘱记录，确认弹窗和删除按钮正常。
14. 真机测试蓝牙搜索和连接。
15. 真机测试相机权限和拍照。

## 10. 打包交接建议

直接压缩整个项目文件夹即可：

```text
<本地仓库目录>
```

建议保留：

```text
app.js
app.json
app.wxss
project.config.json
project.private.config.json
sitemap.json
components/
custom-tab-bar/
docs/
pages/
utils/
```

可以不交：

```text
.git/
```

如果老师需要查看修改历史，可以保留 `.git`；如果只是运行和继续开发，可以不保留。

交接时重点提醒对方先看：

```text
docs/project-handoff.md
docs/algorithm-integration.md
utils/medicineAlgorithm.js
pages/mine/mine.js
pages/index/index.js
```

## 11. 后续开发建议

优先级建议：

1. 统一检查并修复所有中文文案编码。
2. 真机完整测试相机、蓝牙、拨号、日历提醒。
3. 接入真实药品识别算法。
4. 根据真实蓝牙药盒协议实现数据读写。
5. 增加用户数据导出/备份功能。
6. 对用药计划增加更细粒度提醒规则。
7. 对药品照片做本地持久化或云存储，避免临时路径失效。

## 12. 一句话交接重点

这个项目现在已经具备用药计划、医嘱记录、日历查看、拍照录入、紧急联系人、蓝牙连接和算法接入口。接手人员后续最重要的工作是：真机测试、统一文案编码、接入真实药品识别算法、根据真实蓝牙设备协议补充读写逻辑。
