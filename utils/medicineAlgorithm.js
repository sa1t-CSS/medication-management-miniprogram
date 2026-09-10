// Medicine algorithm adapter.
// Teachers can replace runImageRecognizer with the real model/OCR/API implementation.

let imageRecognizer = null;

const emptyResult = (message, code) => ({
  success: false,
  code: code || 'EMPTY_RESULT',
  message: message || '暂未识别到药品信息',
  medicineName: '',
  dose: '',
  confidence: 0,
  rawText: '',
  candidates: []
});

const toNumber = (value) => {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : 0;
};

const normalizeRecognitionResult = (rawResult) => {
  if (!rawResult) {
    return emptyResult();
  }

  if (typeof rawResult === 'string') {
    return parseMedicineText(rawResult);
  }

  const medicineName = rawResult.medicineName || rawResult.name || rawResult.drugName || '';
  const dose = rawResult.dose || rawResult.dosage || rawResult.amount || '';
  const rawText = rawResult.rawText || rawResult.text || '';
  const confidence = toNumber(rawResult.confidence || rawResult.score || 0);
  const candidates = Array.isArray(rawResult.candidates) ? rawResult.candidates : [];
  const success = rawResult.success !== false && Boolean(medicineName || dose || rawText || candidates.length);

  return {
    success,
    code: rawResult.code || (success ? 'OK' : 'EMPTY_RESULT'),
    message: rawResult.message || (success ? '识别完成' : '暂未识别到药品信息'),
    medicineName,
    dose,
    confidence,
    rawText,
    candidates,
    source: rawResult.source || 'image'
  };
};

const parseMedicineText = (text) => {
  const rawText = (text || '').trim();
  if (!rawText) {
    return emptyResult();
  }

  const doseMatch = rawText.match(/(\d+(\.\d+)?\s*(片|粒|袋|支|瓶|ml|mL|mg|g|毫升|毫克|克))/);
  const medicineName = rawText
    .replace(doseMatch ? doseMatch[0] : '', '')
    .replace(/[，,。；;：:\s]+$/g, '')
    .trim();

  return normalizeRecognitionResult({
    success: true,
    medicineName,
    dose: doseMatch ? doseMatch[0] : '',
    confidence: 0.5,
    rawText,
    source: 'text'
  });
};

const runImageRecognizer = (imagePath, context) => {
  if (imageRecognizer) {
    return imageRecognizer(imagePath, context);
  }

  return emptyResult('算法接口已预留，尚未接入真实识别模型', 'NO_ALGORITHM');
};

const recognizeMedicineByImage = (imagePath, context = {}) => {
  if (!imagePath) {
    return Promise.resolve(emptyResult('缺少图片路径', 'NO_IMAGE'));
  }

  return Promise.resolve(runImageRecognizer(imagePath, context))
    .then(normalizeRecognitionResult)
    .catch(error => emptyResult(error && error.message ? error.message : '药品识别失败', 'RECOGNIZE_FAILED'));
};

const registerImageRecognizer = (recognizer) => {
  if (typeof recognizer !== 'function') {
    throw new Error('recognizer must be a function');
  }

  imageRecognizer = recognizer;
};

const matchMedicinePlan = (result, fallback = {}) => {
  const normalizedResult = normalizeRecognitionResult(result);

  return {
    name: normalizedResult.medicineName || fallback.name || '',
    dose: normalizedResult.dose || fallback.dose || '',
    algorithm: normalizedResult
  };
};

module.exports = {
  recognizeMedicineByImage,
  normalizeRecognitionResult,
  parseMedicineText,
  registerImageRecognizer,
  matchMedicinePlan
};
