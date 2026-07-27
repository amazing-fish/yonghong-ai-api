/*
 * 永洪自定义绘图 AI 问答组件 POC v2
 *
 * 永洪自定义绘图运行环境：
 *   $container  当前组件 DOM 的 id（不是 DOM 元素）
 *   options     当前组件数据，options.data 为绑定数据
 *
 * 使用要求：
 *   Chart 库选择 AntV_G2Plot（或其他支持“完整代码”的库）
 *   代码格式选择“完整代码”
 */
(function () {
  "use strict";

  // 永洪提供的是 DOM id：$container。
  // 不能直接使用不存在的 dom 变量。
  var container = document.getElementById($container);
  if (!container) {
    throw new Error("找不到永洪自定义绘图容器：" + String($container));
  }

  var CONFIG = {
    AI_BASE: "https://127.0.0.1:8443",
    POLL_INTERVAL_MS: 2000,
    MAX_ROWS: 300,
    DEFAULT_MODE: "options_data",
    DEFAULT_DATASET: "event_summary",
    FIELD_MAPPING: [
      "event_date",
      "event_id",
      "os_name",
      "sdk_pure_version",
      "total_count",
      "success_count",
      "failure_count",
      "failure_rate",
      "avg_total_time"
    ]
  };

  var state = container.__yhAiState || {
    initialized: false,
    busy: false,
    boundRows: [],
    history: [],
    settings: loadSettings()
  };
  container.__yhAiState = state;
  var currentOptions = typeof options !== "undefined" && options ? options : {};
  state.boundRows = mapOptionsData(currentOptions.data);

  // 永洪在字段绑定或筛选刷新时可能清空容器 DOM，但保留挂载在
  // container 上的状态对象。此时 initialized 仍为 true，必须重新构建界面。
  var uiExists = !!container.querySelector('[data-action="send"]');
  if (!state.initialized || !uiExists) {
    render();
  }
  bindEvents();
  setBusy(state.busy);
  state.initialized = true;
  refreshSummary();

  function mapOptionsData(data) {
    var source = Array.isArray(data) ? data : [];
    return source.slice(0, CONFIG.MAX_ROWS).map(function (row) {
      var result = {};
      CONFIG.FIELD_MAPPING.forEach(function (field, index) {
        result[field] = row["column" + (index + 1)];
      });
      return result;
    });
  }

  function render() {
    container.innerHTML = "";
    container.style.height = "100%";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.fontFamily = "Segoe UI, Microsoft YaHei, sans-serif";
    container.style.background = "#fff";
    container.style.border = "1px solid #dfe5eb";
    container.style.borderRadius = "8px";
    container.style.overflow = "hidden";

    container.appendChild(makeHeader());

    var answer = document.createElement("div");
    answer.id = id("answer");
    answer.style.flex = "1";
    answer.style.overflow = "auto";
    answer.style.padding = "14px";
    answer.style.whiteSpace = "pre-wrap";
    answer.style.lineHeight = "1.55";
    answer.textContent = "输入问题后，组件会取得数据并提交到本地 AI 服务。";
    container.appendChild(answer);

    var settings = document.createElement("details");
    settings.id = id("settings");
    settings.style.borderTop = "1px solid #e5e9ee";
    settings.style.padding = "8px 12px";
    settings.innerHTML =
      '<summary style="cursor:pointer">数据源与 WebAPI 设置</summary>' +
      '<div style="display:grid;gap:8px;margin-top:10px">' +
      '<label>数据模式<select data-field="mode"><option value="options_data">options.data</option><option value="webapi">WebAPI</option></select></label>' +
      '<label>数据集名称<input data-field="dataset" type="text"></label>' +
      '<label>WebAPI action<input data-field="action" type="text" placeholder="从永洪10.2帮助复制"></label>' +
      '<label>xmlData<textarea data-field="xmlData" rows="5" placeholder="从永洪10.2帮助复制，可使用 {{name}} 模板"></textarea></label>' +
      '<label>模板参数 JSON<textarea data-field="params" rows="3" placeholder="{&quot;name&quot;:&quot;value&quot;}"></textarea></label>' +
      '<label>JSON 行路径<input data-field="rowsPath" type="text" placeholder="例如 results.rows，可留空自动识别"></label>' +
      '<div><button data-action="testData">测试取数</button> <button data-action="saveSettings">保存设置</button></div>' +
      '<pre data-field="debug" style="max-height:180px;overflow:auto;background:#f6f8fa;padding:8px"></pre>' +
      '</div>';
    container.appendChild(settings);

    var footer = document.createElement("div");
    footer.style.padding = "12px";
    footer.style.borderTop = "1px solid #e5e9ee";
    footer.innerHTML =
      '<textarea data-field="question" rows="2" style="width:100%;box-sizing:border-box;padding:8px" placeholder="例如：为什么 Android 失败率升高？"></textarea>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:8px">' +
      '<span data-field="status" style="font-size:12px;color:#6b7680"></span>' +
      '<button data-action="send" style="padding:7px 16px">发送</button>' +
      '</div>';
    container.appendChild(footer);

    applySettingsToForm();
  }

  function makeHeader() {
    var header = document.createElement("div");
    header.style.padding = "12px 14px";
    header.style.borderBottom = "1px solid #e5e9ee";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.innerHTML = '<strong>AI 数据问答</strong><span data-field="summary" style="font-size:12px;color:#6b7680"></span>';
    return header;
  }

  function bindEvents() {
    getAction("send").onclick = submitQuestion;
    getAction("testData").onclick = testData;
    getAction("saveSettings").onclick = saveSettingsFromForm;
  }

  async function submitQuestion() {
    if (state.busy) return;
    var question = getField("question").value.trim();
    if (!question) return;

    setBusy(true);
    setAnswer("正在取得数据……");
    try {
      var rows = await acquireRows();
      setStatus("已取得 " + rows.length + " 行，正在提交任务");
      var response = await fetch(CONFIG.AI_BASE + "/api/v1/jobs", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          question: question,
          dashboard: document.title || "永洪报表",
          dataset_name: state.settings.dataset,
          filters: state.settings.params || {},
          rows: rows,
          history: state.history.slice(-10)
        })
      });
      var accepted = await readJson(response);
      if (!response.ok) throw new Error(JSON.stringify(accepted));
      var job = await pollJob(accepted.job_id, accepted.poll_interval_ms || CONFIG.POLL_INTERVAL_MS);
      setAnswer(job.answer || "模型未返回内容");
      setStatus("分析完成");
      state.history.push({role: "user", content: question});
      state.history.push({role: "assistant", content: job.answer || ""});
      state.history = state.history.slice(-10);
    } catch (error) {
      setAnswer("调用失败：" + error.message);
      setStatus("失败");
    } finally {
      setBusy(false);
    }
  }

  async function acquireRows() {
    if (state.settings.mode === "options_data") {
      return state.boundRows.slice(0, CONFIG.MAX_ROWS);
    }
    return fetchWebApiRows();
  }

  async function fetchWebApiRows() {
    var action = (state.settings.action || "").trim();
    if (!action) throw new Error("WebAPI action 不能为空");
    var xmlData = renderTemplate(state.settings.xmlData || "", state.settings.params || {});
    var response = await fetch("/bi/api?action=" + encodeURIComponent(action), {
      method: "POST",
      credentials: "include",
      headers: {"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"},
      body: new URLSearchParams({xmlData: xmlData}).toString()
    });
    var text = await response.text();
    getField("debug").textContent = text.slice(0, 20000);
    if (!response.ok) throw new Error("永洪 WebAPI HTTP " + response.status + ": " + text.slice(0, 1000));
    var payload;
    try { payload = JSON.parse(text); } catch (_) { throw new Error("WebAPI 未返回 JSON，请检查服务端 webapi.result.json 配置或请求格式"); }
    var rows = state.settings.rowsPath ? getByPath(payload, state.settings.rowsPath) : findRows(payload);
    if (!Array.isArray(rows)) throw new Error("无法从 WebAPI 响应中识别行数组，请设置 JSON 行路径");
    return rows.filter(isPlainObject).slice(0, CONFIG.MAX_ROWS);
  }

  async function testData() {
    try {
      saveSettingsFromForm();
      var rows = await acquireRows();
      getField("debug").textContent = JSON.stringify(rows.slice(0, 20), null, 2);
      setStatus("测试成功：" + rows.length + " 行");
    } catch (error) {
      getField("debug").textContent = error.stack || error.message;
      setStatus("取数失败");
    }
  }

  async function pollJob(jobId, intervalMs) {
    while (true) {
      var response = await fetch(CONFIG.AI_BASE + "/api/v1/jobs/" + encodeURIComponent(jobId));
      var job = await readJson(response);
      if (!response.ok) throw new Error(JSON.stringify(job));
      if (job.status === "succeeded") return job;
      if (job.status === "failed" || job.status === "cancelled") throw new Error(job.error || "任务失败");
      var progress = job.progress || {};
      var status = progress.message || job.status;
      if (progress.attempt) status += "；第 " + progress.attempt + " 次排队";
      if (progress.next_retry_seconds !== undefined) status += "；" + progress.next_retry_seconds + " 秒后重试";
      setStatus(status);
      await sleep(intervalMs);
    }
  }

  function saveSettingsFromForm() {
    var paramsText = getField("params").value.trim();
    var params = {};
    if (paramsText) params = JSON.parse(paramsText);
    state.settings = {
      mode: getField("mode").value,
      dataset: getField("dataset").value.trim() || CONFIG.DEFAULT_DATASET,
      action: getField("action").value.trim(),
      xmlData: getField("xmlData").value,
      params: params,
      rowsPath: getField("rowsPath").value.trim()
    };
    try { localStorage.setItem("yh_ai_poc_settings_v2", JSON.stringify(state.settings)); } catch (_) {}
    refreshSummary();
  }

  function loadSettings() {
    try {
      var text = localStorage.getItem("yh_ai_poc_settings_v2");
      if (text) return JSON.parse(text);
    } catch (_) {}
    return {mode: CONFIG.DEFAULT_MODE, dataset: CONFIG.DEFAULT_DATASET, action: "", xmlData: "", params: {}, rowsPath: ""};
  }

  function applySettingsToForm() {
    getField("mode").value = state.settings.mode || CONFIG.DEFAULT_MODE;
    getField("dataset").value = state.settings.dataset || CONFIG.DEFAULT_DATASET;
    getField("action").value = state.settings.action || "";
    getField("xmlData").value = state.settings.xmlData || "";
    getField("params").value = JSON.stringify(state.settings.params || {}, null, 2);
    getField("rowsPath").value = state.settings.rowsPath || "";
  }

  function refreshSummary() {
    var summary = container.querySelector('[data-field="summary"]');
    if (summary) summary.textContent = (state.settings.mode === "webapi" ? "WebAPI" : "绑定数据") + " · " + state.boundRows.length + " 行";
  }

  function renderTemplate(text, params) {
    return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, function (_, key) {
      var value = getByPath(params, key);
      return value === undefined || value === null ? "" : escapeXml(String(value));
    });
  }

  function findRows(value) {
    if (Array.isArray(value) && value.every(isPlainObject)) return value;
    if (!isPlainObject(value)) return null;
    var preferred = ["rows", "data", "records", "items", "list", "result", "results"];
    for (var i = 0; i < preferred.length; i++) {
      if (Object.prototype.hasOwnProperty.call(value, preferred[i])) {
        var found = findRows(value[preferred[i]]);
        if (found) return found;
      }
    }
    var keys = Object.keys(value);
    for (var j = 0; j < keys.length; j++) {
      var nested = findRows(value[keys[j]]);
      if (nested) return nested;
    }
    return null;
  }

  function getByPath(value, path) {
    if (!path) return value;
    return path.split(".").filter(Boolean).reduce(function (current, key) {
      return current == null ? undefined : current[key];
    }, value);
  }

  function escapeXml(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  function isPlainObject(value) { return value && typeof value === "object" && !Array.isArray(value); }
  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  async function readJson(response) { var text = await response.text(); try { return JSON.parse(text); } catch (_) { return {detail: text}; } }
  function setBusy(value) { state.busy = value; getAction("send").disabled = value; }
  function setAnswer(text) { document.getElementById(id("answer")).textContent = text; }
  function setStatus(text) { getField("status").textContent = text; }
  function id(name) {
    if (!container.__yhAiPrefix) {
      container.__yhAiPrefix = "yh-ai-" + Math.random().toString(36).slice(2) + "-";
    }
    return container.__yhAiPrefix + name;
  }
  function getField(name) { return container.querySelector('[data-field="' + name + '"]'); }
  function getAction(name) { return container.querySelector('[data-action="' + name + '"]'); }
})();
