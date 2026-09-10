# 药品识别算法接入说明

本项目已经预留药品识别算法入口，后续算法老师优先接入这个文件：

```text
utils/medicineAlgorithm.js
```

页面侧已经完成调用，不建议算法接入时直接修改页面文件。当前调用链是：

```text
我的页面拍照 -> pages/mine/mine.js -> utils/medicineAlgorithm.js -> 算法实现
```

## 接入位置

在 `utils/medicineAlgorithm.js` 中替换或实现 `runImageRecognizer(imagePath, context)`。

当前默认实现会返回：

```js
{
  success: false,
  code: 'NO_ALGORITHM',
  message: '算法接口已预留，尚未接入真实识别模型'
}
```

## 输入参数

```js
runImageRecognizer(imagePath, context)
```

字段说明：

- `imagePath`: 小程序拍照后的临时图片路径，例如 `wxfile://...`
- `context.source`: 调用来源，目前是 `mine.planPhoto`
- `context.currentPlan`: 当前表单已有内容，包含 `name`、`dose`、`date`、`duration`、`imagePath`

## 推荐输出格式

算法返回对象会被统一标准化，推荐直接返回：

```js
{
  success: true,
  medicineName: '阿莫西林胶囊',
  dose: '1粒',
  confidence: 0.92,
  rawText: '识别到的原始文字',
  candidates: [
    {
      medicineName: '阿莫西林胶囊',
      dose: '1粒',
      confidence: 0.92
    }
  ]
}
```

兼容字段：

- 药名可以用 `medicineName`、`name`、`drugName`
- 剂量可以用 `dose`、`dosage`、`amount`
- 置信度可以用 `confidence`、`score`
- 原始文本可以用 `rawText`、`text`

## 页面行为

拍照成功后，页面会自动调用：

```js
medicineAlgorithm.recognizeMedicineByImage(imagePath, context)
```

如果识别成功：

- 药品名称为空时，自动填入 `medicineName`
- 剂量为空时，自动填入 `dose`
- 识别结果会保存到计划的 `algorithmResult` 字段中

如果识别失败：

- 不会影响手动填写
- 页面只显示失败提示

## 异步支持

`runImageRecognizer` 可以直接返回对象，也可以返回 `Promise`：

```js
const runImageRecognizer = (imagePath, context) => {
  return new Promise((resolve, reject) => {
    // 在这里调用 OCR、云函数、模型接口或本地能力
    resolve({
      success: true,
      medicineName: '示例药品',
      dose: '1片',
      confidence: 0.9
    });
  });
};
```

## 小程序限制

- 小程序前端不能直接运行大型模型，通常建议接入云函数、后端接口或轻量 OCR。
- 如果需要上传图片到服务器，需要在微信公众平台配置合法域名。
- 如果使用第三方 OCR/API，不要把长期密钥硬编码在小程序前端。
