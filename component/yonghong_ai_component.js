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
    DEFAULT_FIELD_DEFINITIONS: [],
    METADATA_MAX_DEPTH: 4,
    METADATA_MAX_ARRAY_ITEMS: 5,
    METADATA_MAX_OBJECT_KEYS: 30,
    METADATA_MAX_STRING_CHARS: 500,
    METADATA_MAX_OPTION_KEYS: 100,
    METADATA_MAX_CANDIDATES: 20,
    METADATA_MAX_KEY_CHARS: 120,
    METADATA_MAX_TOTAL_NODES: 500,
    METADATA_MAX_TOTAL_CHARS: 24000,
    METADATA_MAX_JSON_CHARS: 32000,
    METADATA_MAX_SCANNED_OPTION_KEYS: 2000,
    METADATA_MAX_SCANNED_OBJECT_KEYS: 200
  };
  var SETTINGS_STORAGE_KEY = createSettingsStorageKey();

  var state = container.__yhAiState || {
    initialized: false,
    busy: false,
    boundRows: [],
    boundFields: [],
    history: [],
    settings: loadSettings()
  };
  container.__yhAiState = state;
  var currentOptions = typeof options !== "undefined" && options ? options : {};
  state.settings.fieldDefinitions = normalizeFieldDefinitions(state.settings.fieldDefinitions);
  state.boundFields = detectBoundFields(currentOptions, state.settings.fieldDefinitions);
  state.boundRows = mapOptionsData(currentOptions.data, state.boundFields);

  // 永洪在字段绑定或筛选刷新时可能清空容器 DOM，但保留挂载在
  // container 上的状态对象。此时 initialized 仍为 true，必须重新构建界面。
  var uiExists =
    !!container.querySelector('[data-action="send"]') &&
    !!container.querySelector('[data-action="copyMetadata"]');
  if (!state.initialized || !uiExists) {
    render();
  }
  bindEvents();
  setBusy(state.busy);
  state.initialized = true;
  refreshSummary();

  function mapOptionsData(data, fields) {
    var source = Array.isArray(data) ? data : [];
    return source.slice(0, CONFIG.MAX_ROWS).map(function (row) {
      var item = isPlainObject(row) ? row : {};
      var result = {};
      fields.forEach(function (field) {
        result[field.name] = item[field.source];
      });
      return result;
    });
  }

  function detectBoundFields(runtimeOptions, definitions) {
    var runtime = isPlainObject(runtimeOptions) ? runtimeOptions : {};
    var source = Array.isArray(runtime.data) ? runtime.data : [];
    var keys = Object.create(null);

    // options.data carries row values. Yonghong also exposes options.columnN
    // arrays, which lets us retain bindings even when filtering returns zero rows.
    Object.keys(runtime).forEach(function (key) {
      if (/^column\d+$/.test(key)) keys[key] = true;
    });
    source.slice(0, CONFIG.MAX_ROWS).forEach(function (row) {
      if (!isPlainObject(row)) return;
      Object.keys(row).forEach(function (key) {
        if (/^column\d+$/.test(key)) keys[key] = true;
      });
    });

    var configured = Object.create(null);
    definitions.forEach(function (field) {
      configured[field.source] = field;
    });

    var usedNames = Object.create(null);
    return Object.keys(keys).sort(compareColumnKeys).map(function (sourceName) {
      var definition = configured[sourceName] || {};
      var fieldName = makeUniqueFieldName(definition.name || sourceName, sourceName, usedNames);
      usedNames[fieldName] = true;
      return {
        source: sourceName,
        name: fieldName,
        role: definition.role || "unknown"
      };
    });
  }

  function makeUniqueFieldName(preferredName, sourceName, usedNames) {
    var preferred = String(preferredName || sourceName).trim() || sourceName;
    var reserved = preferred === "__proto__" || preferred === "prototype" || preferred === "constructor";
    if (!reserved && !usedNames[preferred]) return preferred;
    if (!usedNames[sourceName]) return sourceName;

    var suffix = 2;
    while (usedNames[sourceName + "_" + suffix]) suffix += 1;
    return sourceName + "_" + suffix;
  }

  function normalizeFieldDefinitions(value) {
    var source = Array.isArray(value) ? value : [];
    var usedSources = Object.create(null);
    return source.map(function (item) {
      var sourceName = item && String(item.source || "").trim();
      if (!/^column\d+$/.test(sourceName) || usedSources[sourceName]) return null;
      usedSources[sourceName] = true;
      var role = item.role === "dimension" || item.role === "measure" ? item.role : "unknown";
      return {
        source: sourceName,
        name: String(item.name || sourceName).trim() || sourceName,
        role: role
      };
    }).filter(Boolean).sort(function (left, right) {
      return compareColumnKeys(left.source, right.source);
    });
  }

  function compareColumnKeys(left, right) {
    return parseInt(left.replace("column", ""), 10) - parseInt(right.replace("column", ""), 10);
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
      '<label>字段映射 JSON（可选）<textarea data-field="fields" rows="8" placeholder="[{&quot;source&quot;:&quot;column1&quot;,&quot;name&quot;:&quot;event_date&quot;,&quot;role&quot;:&quot;dimension&quot;}]"></textarea></label>' +
      '<div style="font-size:12px;color:#6b7680">未配置时保留 columnN。永洪自定义绘图的公开运行时数据不包含原字段名、维度/度量角色或计算公式。</div>' +
      '<label>WebAPI action<input data-field="action" type="text" placeholder="从永洪10.2帮助复制"></label>' +
      '<label>xmlData<textarea data-field="xmlData" rows="5" placeholder="从永洪10.2帮助复制，可使用 {{name}} 模板"></textarea></label>' +
      '<label>模板参数 JSON<textarea data-field="params" rows="3" placeholder="{&quot;name&quot;:&quot;value&quot;}"></textarea></label>' +
      '<label>JSON 行路径<input data-field="rowsPath" type="text" placeholder="例如 results.rows，可留空自动识别"></label>' +
      '<div><button data-action="testData">测试取数与字段</button> <button data-action="copyMetadata">复制元数据诊断</button> <button data-action="saveSettings">保存设置</button></div>' +
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
    getAction("copyMetadata").onclick = copyMetadataDiagnostics;
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
          fields: state.settings.mode === "options_data" ? state.boundFields : [],
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
      getField("debug").textContent = JSON.stringify({
        binding: state.settings.mode === "options_data" ? inspectRuntimeBinding() : null,
        fields: state.settings.mode === "options_data" ? state.boundFields : [],
        rows: rows.slice(0, 20)
      }, null, 2);
      setStatus("测试成功：" + rows.length + " 行，" + state.boundFields.length + " 个绑定字段");
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

    var fieldsText = getField("fields").value.trim();
    var fieldDefinitions = fieldsText ? JSON.parse(fieldsText) : [];
    if (!Array.isArray(fieldDefinitions)) throw new Error("字段映射必须是 JSON 数组");

    state.settings = {
      mode: getField("mode").value,
      dataset: getField("dataset").value.trim() || CONFIG.DEFAULT_DATASET,
      fieldDefinitions: normalizeFieldDefinitions(fieldDefinitions),
      action: getField("action").value.trim(),
      xmlData: getField("xmlData").value,
      params: params,
      rowsPath: getField("rowsPath").value.trim()
    };
    state.boundFields = detectBoundFields(currentOptions, state.settings.fieldDefinitions);
    state.boundRows = mapOptionsData(currentOptions.data, state.boundFields);
    try { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state.settings)); } catch (_) {}
    refreshSummary();
  }

  function createSettingsStorageKey() {
    var dashboardScope = "";
    try {
      var params = new URLSearchParams(window.location.search || "");
      dashboardScope =
        params.get("db") ||
        params.get("dashboard") ||
        (window.location.pathname || "") + (window.location.search || "");
    } catch (_) {
      dashboardScope = window.location.pathname || "unknown-dashboard";
    }
    return (
      "yh_ai_poc_settings_v3:" +
      encodeURIComponent(dashboardScope) +
      ":" +
      encodeURIComponent(String($container))
    );
  }

  function loadSettings() {
    var scoped = readStoredSettings(SETTINGS_STORAGE_KEY);
    if (scoped) return normalizeStoredSettings(scoped, true);

    // v2 used one origin-wide key. Migrate the reusable WebAPI settings once,
    // but intentionally drop its field mapping because it is not component-safe.
    var legacy = readStoredSettings("yh_ai_poc_settings_v2");
    if (legacy) {
      var migrated = normalizeStoredSettings(legacy, false);
      try { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(migrated)); } catch (_) {}
      return migrated;
    }

    return normalizeStoredSettings({}, false);
  }

  function readStoredSettings(key) {
    try {
      var text = localStorage.getItem(key);
      if (!text) return null;
      var value = JSON.parse(text);
      return isPlainObject(value) ? value : null;
    } catch (_) {
      return null;
    }
  }

  function normalizeStoredSettings(value, keepFieldDefinitions) {
    return {
      mode: value.mode === "webapi" ? "webapi" : CONFIG.DEFAULT_MODE,
      dataset: String(value.dataset || CONFIG.DEFAULT_DATASET),
      fieldDefinitions: keepFieldDefinitions
        ? normalizeFieldDefinitions(value.fieldDefinitions)
        : [],
      action: String(value.action || ""),
      xmlData: String(value.xmlData || ""),
      params: isPlainObject(value.params) ? value.params : {},
      rowsPath: String(value.rowsPath || "")
    };
  }

  function applySettingsToForm() {
    getField("mode").value = state.settings.mode || CONFIG.DEFAULT_MODE;
    getField("dataset").value = state.settings.dataset || CONFIG.DEFAULT_DATASET;
    getField("fields").value = JSON.stringify(
      state.settings.fieldDefinitions || [],
      null,
      2
    );
    getField("action").value = state.settings.action || "";
    getField("xmlData").value = state.settings.xmlData || "";
    getField("params").value = JSON.stringify(state.settings.params || {}, null, 2);
    getField("rowsPath").value = state.settings.rowsPath || "";
  }

  function refreshSummary() {
    var summary = container.querySelector('[data-field="summary"]');
    if (summary) {
      summary.textContent =
        (state.settings.mode === "webapi" ? "WebAPI" : "绑定数据") +
        " · " + state.boundRows.length + " 行" +
        " · " + state.boundFields.length + " 字段";
    }
  }

  function inspectRuntimeBinding() {
    var keySets = collectRuntimeOptionKeySets();
    return {
      optionsKeys: keySets.optionKeys.map(truncateMetadataKey),
      metadataCandidateKeys: keySets.candidateKeys.map(truncateMetadataKey),
      omittedRowCandidateKeys: keySets.omittedRowCandidateKeys.map(truncateMetadataKey),
      optionKeyScan: keySets.scan,
      boundSources: state.boundFields.slice(0, CONFIG.METADATA_MAX_OPTION_KEYS).map(function (field) {
        return truncateMetadataKey(field.source);
      }),
      configuredFieldCount: state.settings.fieldDefinitions.length,
      note: "字段名、角色和计算公式不会从 options.data 自动推断；如 metadataCandidateKeys 非空，可把本段结果交给开发者继续适配。"
    };
  }

  async function copyMetadataDiagnostics() {
    try {
      var text = stringifyMetadataDiagnostic(buildMetadataDiagnostic());
      getField("debug").textContent = text;
      var copied = await copyTextToClipboard(text);
      setStatus(copied ? "元数据诊断已复制" : "已生成元数据诊断，请从下方手动复制");
    } catch (error) {
      getField("debug").textContent = error.stack || error.message;
      setStatus("元数据诊断生成失败");
    }
  }

  function buildMetadataDiagnostic() {
    var runtime = isPlainObject(currentOptions) ? currentOptions : {};
    var keySets = collectRuntimeOptionKeySets();
    var candidateKeys = keySets.candidateKeys;
    var candidateOutputKeys = makeUniqueMetadataOutputKeys(candidateKeys);
    var metadata = Object.create(null);
    var budget = {
      nodes: 0,
      chars: 0,
      truncated: false,
      exhausted: false
    };

    candidateKeys.forEach(function (key, index) {
      if (budget.exhausted) return;
      var outputKey = candidateOutputKeys[index];
      try {
        if (!consumeMetadataChars(budget, outputKey.length)) return;
        metadata[outputKey] = summarizeMetadataValue(runtime[key], 0, [], budget);
      } catch (_) {
        metadata[outputKey] = "[读取失败]";
      }
    });

    return {
      schemaVersion: 1,
      optionsKeys: keySets.optionKeys.map(truncateMetadataKey),
      metadataCandidateKeys: candidateOutputKeys,
      omittedRowCandidateKeys: keySets.omittedRowCandidateKeys.map(truncateMetadataKey),
      optionKeyScan: keySets.scan,
      boundSources: state.boundFields.slice(0, CONFIG.METADATA_MAX_OPTION_KEYS).map(function (field) {
        return truncateMetadataKey(field.source);
      }),
      configuredFields: state.boundFields.slice(0, CONFIG.METADATA_MAX_OPTION_KEYS).map(function (field) {
        return {
          source: truncateMetadataKey(field.source),
          name: String(field.name).slice(0, CONFIG.METADATA_MAX_KEY_CHARS),
          role: field.role
        };
      }),
      metadata: metadata,
      limits: {
        maxDepth: CONFIG.METADATA_MAX_DEPTH,
        maxArrayItems: CONFIG.METADATA_MAX_ARRAY_ITEMS,
        maxObjectKeys: CONFIG.METADATA_MAX_OBJECT_KEYS,
        maxStringChars: CONFIG.METADATA_MAX_STRING_CHARS,
        maxOptionKeys: CONFIG.METADATA_MAX_OPTION_KEYS,
        maxCandidates: CONFIG.METADATA_MAX_CANDIDATES,
        maxKeyChars: CONFIG.METADATA_MAX_KEY_CHARS,
        maxTotalNodes: CONFIG.METADATA_MAX_TOTAL_NODES,
        maxTotalChars: CONFIG.METADATA_MAX_TOTAL_CHARS,
        maxJsonChars: CONFIG.METADATA_MAX_JSON_CHARS,
        maxScannedOptionKeys: CONFIG.METADATA_MAX_SCANNED_OPTION_KEYS,
        maxScannedObjectKeys: CONFIG.METADATA_MAX_SCANNED_OBJECT_KEYS
      },
      budget: {
        nodes: budget.nodes,
        chars: budget.chars,
        truncated: budget.truncated,
        exhausted: budget.exhausted
      },
      safety: "未包含 options.data、顶层 columnN 值、函数、DOM 对象或敏感键；诊断仅在浏览器本地生成。"
    };
  }

  function collectRuntimeOptionKeySets() {
    var runtime = isPlainObject(currentOptions) ? currentOptions : {};
    var optionKeys = [];
    var candidateKeys = [];
    var omittedRowCandidateKeys = [];
    var scanned = 0;
    var scanTruncated = false;
    var displayTruncated = false;
    var candidatesTruncated = false;

    try {
      for (var key in runtime) {
        scanned += 1;
        if (scanned > CONFIG.METADATA_MAX_SCANNED_OPTION_KEYS) {
          scanTruncated = true;
          break;
        }
        if (!Object.prototype.hasOwnProperty.call(runtime, key)) continue;
        if (isSensitiveMetadataKey(key) || isSensitiveMetadataString(String(key))) continue;

        if (optionKeys.length < CONFIG.METADATA_MAX_OPTION_KEYS) {
          optionKeys.push(key);
        } else {
          displayTruncated = true;
        }

        if (!looksLikeMetadataKey(key)) continue;
        var isRowCandidate = isTopLevelRowDataKey(key);
        if (!isRowCandidate) {
          try {
            isRowCandidate = isLikelyRowArray(key, runtime[key]);
          } catch (_) {
            isRowCandidate = false;
          }
        }
        if (isRowCandidate) {
          if (omittedRowCandidateKeys.length < CONFIG.METADATA_MAX_CANDIDATES) {
            omittedRowCandidateKeys.push(key);
          }
          continue;
        }
        if (isMetadataCandidateKey(key)) {
          if (candidateKeys.length < CONFIG.METADATA_MAX_CANDIDATES) {
            candidateKeys.push(key);
          } else {
            candidatesTruncated = true;
          }
        }
      }
    } catch (_) {
      scanTruncated = true;
    }

    optionKeys.sort();
    candidateKeys.sort();
    omittedRowCandidateKeys.sort();
    return {
      optionKeys: optionKeys,
      candidateKeys: candidateKeys,
      omittedRowCandidateKeys: omittedRowCandidateKeys,
      scan: {
        scanned: Math.min(scanned, CONFIG.METADATA_MAX_SCANNED_OPTION_KEYS),
        scanTruncated: scanTruncated,
        displayTruncated: displayTruncated,
        candidatesTruncated: candidatesTruncated
      }
    };
  }

  function isMetadataCandidateKey(key) {
    return (
      key !== "data" &&
      !/^column\d+$/.test(key) &&
      !isSensitiveMetadataKey(key) &&
      !isTopLevelRowDataKey(key) &&
      looksLikeMetadataKey(key)
    );
  }

  function looksLikeMetadataKey(key) {
    return /field|column|meta|label|name|alias|dimension|measure|metric|aggregat|formula|expression|calc|query|qinfo|header|schema|binding|bind|role|type|definition|function|choice|enum|categor/i.test(String(key));
  }

  function isTopLevelRowDataKey(key) {
    var text = String(key);
    var compactText = text.replace(/[-_.\s]/g, "");
    if (/^(?:(?:dimension|hierarchy|level))?members?(?:(?:list|items|collections?|map|by[a-z0-9]+|lookup|index|dictionary|dict)|(?:caches?|cached)(?:map|by[a-z0-9]+|lookup|index|dictionary|dict)?)?$/i.test(compactText)) return true;
    if (/^(?:dimension|hierarchy|level)(?:values?|nodes?)(?:(?:list|items|collections?|map|by[a-z0-9]+|lookup|index|dictionary|dict)|(?:caches?|cached)(?:map|by[a-z0-9]+|lookup|index|dictionary|dict)?)?$/i.test(compactText)) return true;
    if (/^(?:query(?:data|rows?|records?|results?|resultsets?|responses?|outputs?)?|data|rows?|records?|results?|resultsets?|responses?|outputs?)(?:cache|cached)(?:map|by[a-z0-9]+|lookup|index|dictionary|dict)?$/i.test(compactText)) return true;
    if (/^(?:rows?|records?)(?:data|values?|metadata|meta|info)?$/i.test(compactText)) return true;
    if (/^(?:rows?|records?|cells?)(?:data|values?|metadata|meta|info)?collections?$/i.test(compactText)) return true;
    if (/^(?:query)?(?:data|rows?|records?|rowdata|recorddata|rowmetadata|recordmetadata|results?|resultsets?|responses?|outputs?|entries?|items?|values?|samples?|examples?|payload|content)(?:map|by[a-z0-9]+|lookup|index|dictionary|dict)$/i.test(compactText)) return true;
    if (/^(?:cells?|cellvalues?|cellmetadata|cellmeta)(?:data|values?|map|by[a-z0-9]+|lookup|index|dictionary|dict)?$/i.test(compactText)) return true;
    if (isStructuralMetadataCollectionKey(compactText)) return false;
    if (/metadata$/i.test(text)) return false;
    return /(?:data|datasets?|rows?|records?|(?:result|record)sets?|values?|samples?|examples?|results?|responses?|outputs?|entries?|items?|list|payload|content)$/i.test(text);
  }

  function isStructuralMetadataCollectionKey(key) {
    return /^(?:fields?|columns?|headers?|schemas?|metadata|definitions?|dimensions?|measures?|metrics?|bindings?|calculations?|formulas?|expressions?|aggregates?|aggregations?|functions?|choices?|options?|enums?|categories?|labels?|roles?|types?|aliases?)(?:list|items|collections?)$/i.test(String(key));
  }

  function isSensitiveMetadataKey(key) {
    var text = String(key);
    return (
      /^[A-Za-z][A-Za-z0-9]{0,120}pass$/i.test(text) ||
      /^[A-Za-z][A-Za-z0-9]{0,120}(?:tokens?|secrets?|passwords?|passwds?|pwds?|passphrases?|credentials?|sessionids?|cookies?)$/i.test(text) ||
      /(?:tokens?|secrets?|passwords?|passwds?|pwds?|passphrases?|credentials?|session[-_.]?ids?|cookies?)(?:string|value|text|data|blob|bytes|base64)$/i.test(text) ||
      /(?:tokens?|secrets?|passwords?|passwds?|pwds?|passphrases?|credentials?|session[-_.]?ids?|cookies?)(?:map|lookup|index|dictionary|dict|by[a-z0-9]+)$/i.test(text) ||
      /(?:password|passwd|pwd)[-_.]?(?:hash|digest)$/i.test(text) ||
      /(?:authorization|auth)[-_.]?code$/i.test(text) ||
      /^(?:set[-_.]?)?cookies?[-_.]?headers?$/i.test(text) ||
      /^x[-_.]?(?:amz|goog)[-_.]?signature$/i.test(text) ||
      /^[A-Za-z0-9][A-Za-z0-9_.-]{0,120}[-_.]signature(?:[-_.](?:sha)?\d{1,4})?$/i.test(text) ||
      /^(?:[A-Za-z][A-Za-z0-9]{0,120})?signatures?$/i.test(text) ||
      /^session[-_.]?id$/i.test(text) ||
      /^(?:YHBISESSIONID|HWWAFSESID|HWWAFSESTIME|JSESSIONID|PHPSESSID|ASP\.NET_SESSIONID|CONNECT\.SID)$/i.test(text) ||
      /^(?:DB|DATABASE|SMTP|FTP|SFTP|SSH|REDIS|MYSQL|MARIADB|MONGO|MONGODB|PG|POSTGRES|POSTGRESQL|PROXY|CLIENT|SERVICE|ACCOUNT|ADMIN|USER|APP|API)PASS$/.test(text) ||
      hasSensitiveMetadataKeyAlias(text) ||
      /(?:^|[^a-z0-9])(?:pass|bearers?|cookies?|tokens?|jwts?|secrets?|passwords?|passwds?|pwds?|passphrases?|sessions?|credentials?|csrf)(?:$|[^a-z0-9])|(?:^|[^a-z0-9])auth(?:s|entication|orization)?(?:$|[^a-z0-9])|auth(?:entication|orization)?[-_]?(?:token|header|value|config|settings?)|(?:basic|bearer|proxy)[-_]?auth/i.test(text)
    );
  }

  function hasSensitiveMetadataKeyAlias(text) {
    return (
      /(?:api|access|account|consumer|secret|subscription|encryption|signing|master|symmetric|private)[-_.\s]?keys?(?:[-_.\s]?(?:data|id|value|pem|base64|string|text|blob|bytes|map|lookup|index|dictionary|dict|by[a-z0-9]+))?$/i.test(text) ||
      /(?:tls|ssl)[-_.\s]?key(?:[-_.\s]?(?:data|id|value|pem|base64|string|text|blob|bytes|map|lookup|index|dictionary|dict|by[a-z0-9]+))?$/i.test(text) ||
      /client[-_.\s]?(?:cert|key(?:[-_.\s]?(?:data|id|value|pem|base64|string|text|blob|bytes|map|lookup|index|dictionary|dict|by[a-z0-9]+))?)$/i.test(text) ||
      /key[-_.\s]?store$/i.test(text) ||
      /webhook(?:[-_.\s]?(?:url|uri|endpoint))?$/i.test(text) ||
      /shared[-_.\s]?access(?:[-_.\s]?signature)?$/i.test(text) ||
      /sas[-_.\s]?token$/i.test(text) ||
      /(?:pfx|p12|pkcs[-_.\s]?(?:12|#12))$/i.test(text)
    );
  }

  function isNestedRowDataKey(key) {
    var text = String(key);
    return (
      isTopLevelRowDataKey(text) ||
      /^(items?|list)$/i.test(text) ||
      /(?:sample|example|row|record)(?:data|values?)?$/i.test(text)
    );
  }

  function summarizeMetadataValue(value, depth, seen, budget, schemaContext) {
    if (!consumeMetadataNode(budget)) return "[全局诊断预算已耗尽]";
    if (value === null || typeof value === "boolean" || typeof value === "number") return value;
    if (typeof value === "string") {
      return summarizeMetadataString(value, budget);
    }
    if (value !== null && typeof value === "object") {
      try {
        return summarizeMetadataString(String.prototype.valueOf.call(value), budget);
      } catch (_) {
        // Continue with ordinary object handling when this is not a boxed String.
      }
    }
    if (isArrayBufferView(value)) return "[已省略二进制视图]";
    if (typeof value === "undefined") return "[已省略 undefined]";
    if (typeof value === "function") return "[已省略函数]";
    if (typeof value === "symbol") return summarizeMetadataString("[已省略 Symbol]", budget);
    if (typeof value === "bigint") return summarizeMetadataString("[已省略 BigInt]", budget);
    if (isDomLike(value)) return "[已省略 DOM 对象]";
    if (seen.indexOf(value) >= 0) return "[循环引用]";
    if (Array.isArray(value) && isSensitiveNameValueTuple(value)) {
      return "[已省略敏感名称/值元组]";
    }
    if (depth >= CONFIG.METADATA_MAX_DEPTH) {
      return Array.isArray(value) ? "[数组层级已截断]" : "[对象层级已截断]";
    }
    if (Object.prototype.toString.call(value) === "[object Date]") {
      try {
        return summarizeMetadataString(String(value.toISOString()), budget);
      } catch (_) {
        try {
          return summarizeMetadataString(String(value), budget);
        } catch (_) {
          return "[Date 读取失败]";
        }
      }
    }
    if (!Array.isArray(value) && isPrivateJwk(value)) {
      return "[已省略私有 JWK]";
    }
    if (!Array.isArray(value) && isSensitiveNamedValueDescriptor(value)) {
      return "[已省略敏感名称/值描述符]";
    }

    seen.push(value);
    try {
      if (Array.isArray(value)) {
        var arrayResult = value.slice(0, CONFIG.METADATA_MAX_ARRAY_ITEMS).map(function (item) {
          return summarizeMetadataValue(item, depth + 1, seen, budget);
        });
        if (value.length > CONFIG.METADATA_MAX_ARRAY_ITEMS) {
          arrayResult.push("[其余 " + (value.length - CONFIG.METADATA_MAX_ARRAY_ITEMS) + " 项已省略]");
        }
        return arrayResult;
      }

      var result = Object.create(null);
      var keySample = collectBoundedMetadataObjectKeys(value);
      var outputKeys = makeUniqueMetadataOutputKeys(keySample.keys);
      keySample.keys.forEach(function (key, index) {
        if (budget.exhausted) return;
        var outputKey = outputKeys[index];
        if (!consumeMetadataChars(budget, outputKey.length)) return;
        try {
          var childValue = value[key];
          var preserveDependentRequired = schemaContext === "dependentRequired" && isNonEmptyStringArray(childValue);
          var preserveSchemaProperty =
            (schemaContext === "properties" || schemaContext === "definitions") &&
            (isPlainObject(childValue) || typeof childValue === "boolean");
          var preserveSchemaStructure =
            preserveDependentRequired ||
            preserveSchemaProperty ||
            isJsonSchemaStructureProperty(value, key, childValue);
          var preserveStructuralScalar = isStructuralScalarMetadataProperty(value, key, childValue);
          if (
            !preserveSchemaStructure &&
            ((isNestedRowDataKey(key) && !preserveStructuralScalar) || isLikelyRowArray(key, childValue))
          ) {
            result[outputKey] = describeOmittedRowData(childValue);
          } else {
            result[outputKey] = summarizeMetadataValue(
              childValue,
              preserveDependentRequired ? depth : depth + 1,
              seen,
              budget,
              getJsonSchemaChildContext(value, key, childValue)
            );
          }
        } catch (_) {
          result[outputKey] = "[读取失败]";
        }
      });
      if (keySample.truncated) {
        result.__truncatedKeys = true;
      }
      if (keySample.unreadable) {
        result.__keyEnumerationError = true;
      }
      return result;
    } finally {
      seen.pop();
    }
  }

  function summarizeMetadataString(value, budget) {
    if (isSensitiveMetadataString(value)) {
      return "[已省略可能包含凭证的字符串]";
    }
    var remainingChars = Math.max(0, CONFIG.METADATA_MAX_TOTAL_CHARS - budget.chars);
    if (remainingChars === 0 && value.length > 0) {
      budget.truncated = true;
      budget.exhausted = true;
      return "[全局诊断预算已耗尽]";
    }
    var maxChars = Math.min(CONFIG.METADATA_MAX_STRING_CHARS, remainingChars);
    var text = value.slice(0, maxChars);
    consumeMetadataChars(budget, text.length);
    if (value.length > text.length) {
      budget.truncated = true;
      return text + "...[已截断]";
    }
    return text;
  }

  function isSensitiveMetadataString(value) {
    var sample = value.slice(0, CONFIG.METADATA_MAX_STRING_CHARS);
    var inspectionSample = normalizeMetadataStringEscapes(sample);
    var normalizedUrlSample = normalizeMetadataUrlDelimiters(inspectionSample);
    return (
      isSerializedPrivateJwk(inspectionSample, value.length > sample.length) ||
      isSerializedSensitiveTuple(inspectionSample, value.length > sample.length) ||
      isSerializedSensitiveDescriptor(inspectionSample, value.length > sample.length) ||
      isSerializedSensitiveYamlDescriptor(inspectionSample, value.length > sample.length) ||
      isSensitiveMetadataAssignment(inspectionSample) ||
      isSensitiveMetadataAssignment(normalizedUrlSample) ||
      isSensitiveWhitespaceMetadataAssignment(inspectionSample) ||
      isSensitiveMetadataXml(inspectionSample, value.length > sample.length) ||
      /\b(?:bearer|basic)\s+[a-z0-9+/_=.-]+/i.test(inspectionSample) ||
      /\beyJ[a-z0-9_-]{8,}\.[a-z0-9_-]+/i.test(inspectionSample) ||
      /(?:[a-z][a-z0-9+.-]*:)?\/\/[^\/\s@]+@/i.test(normalizedUrlSample) ||
      /https?:\/\/(?:hooks\.slack\.com\/services|(?:canary\.)?discord(?:app)?\.com\/api\/webhooks)\//i.test(normalizedUrlSample) ||
      /(?:^|[\s;,])[^:\s@\/]+:[^@\s\/]+@(?:tcp|unix)\([^)\s]*\)(?:\/|$)/i.test(inspectionSample) ||
      /(?:^|[\s;,])(?:jdbc:oracle:thin:)?[^\/\s@:]+\/[^@\s\/]+@(?:\[[^\]]+\]|[a-z0-9_.-]+)(?::\d+)?(?:\/[^\s]*)?/i.test(inspectionSample) ||
      (
        value.length > CONFIG.METADATA_MAX_STRING_CHARS &&
        /(?:[a-z][a-z0-9+.-]*:)?\/\/[^\/\s@?#:]{1,64}:[^\/\s@?#]+$/i.test(normalizedUrlSample)
      ) ||
      (
        value.length > CONFIG.METADATA_MAX_STRING_CHARS &&
        /(?:[a-z][a-z0-9+.-]*:)?\/\/[^\/\s@?#]{32,}$/i.test(normalizedUrlSample)
      ) ||
      (
        value.length > CONFIG.METADATA_MAX_STRING_CHARS &&
        /(?:^|[\s;,])[^:\s@\/]{1,64}:[^@\s\/]{32,}$/i.test(inspectionSample)
      ) ||
      (
        value.length > CONFIG.METADATA_MAX_STRING_CHARS &&
        /(?:^|[\s;,])(?:jdbc:oracle:thin:)?[^\/\s@:]+\/[^@\s\/]{32,}$/i.test(inspectionSample)
      ) ||
      /[?&#](?:code|auth[-_]?code|authorization[-_]?code|key|sig|signature|awsaccesskeyid|x-amz-(?:credential|signature)|x-goog-(?:credential|signature))=/i.test(normalizedUrlSample) ||
      /-----BEGIN (?:(?:RSA|DSA|EC|OPENSSH|ENCRYPTED) )?PRIVATE KEY-----|-----BEGIN PGP PRIVATE KEY BLOCK-----/i.test(inspectionSample) ||
      /\b(?:YHBISESSIONID|HWWAFSESID|HWWAFSESTIME|JSESSIONID|PHPSESSID|ASP\.NET_SESSIONID|CONNECT\.SID)\s*=/i.test(inspectionSample)
    );
  }

  function normalizeMetadataStringEscapes(value) {
    var result = value;
    for (var pass = 0; pass < 3; pass += 1) {
      var normalized = result
        .replace(/&#(?:x([0-9a-f]{1,6})|([0-9]{1,7}));/gi, function (entity, hex, decimal) {
          var code = parseInt(hex || decimal, hex ? 16 : 10);
          return code >= 0 && code <= 127 ? String.fromCharCode(code) : entity;
        })
        .replace(/&(quot|apos|colon|equals|amp|lt|gt|sol|quest|num|percnt|lowbar|hyphen|period);/gi, function (_, name) {
          var entities = {
            quot: "\"",
            apos: "'",
            colon: ":",
            equals: "=",
            amp: "&",
            lt: "<",
            gt: ">",
            sol: "/",
            quest: "?",
            num: "#",
            percnt: "%",
            lowbar: "_",
            hyphen: "-",
            period: "."
          };
          return entities[name.toLowerCase()];
        })
        .replace(/\\u([0-9a-f]{4})/gi, function (_, hex) {
          return String.fromCharCode(parseInt(hex, 16));
        })
        .replace(/\\u0022/gi, "\"")
        .replace(/\\u0027/gi, "'")
        .replace(/\\u003a/gi, ":")
        .replace(/\\u003d/gi, "=")
        .replace(/\\u005c/gi, "\\")
        .replace(/\\(["'\\])/g, "$1");
      if (normalized === result) break;
      result = normalized;
    }
    return result;
  }

  function isSensitiveMetadataAssignment(sample) {
    return (
      hasSensitiveMetadataAssignmentKey(sample) ||
      /(?:^|[^A-Za-z0-9])[A-Za-z][A-Za-z0-9]*Pass["']?\s*[:=]/.test(sample) ||
      /(?:^|[^A-Za-z0-9])(?:DB|DATABASE|SMTP|FTP|SFTP|SSH|REDIS|MYSQL|MARIADB|MONGO|MONGODB|PG|POSTGRES|POSTGRESQL|PROXY|CLIENT|SERVICE|ACCOUNT|ADMIN|USER|APP|API)PASS["']?\s*[:=]/.test(sample) ||
      /(?:^|[^a-z0-9])(?:auth|authorization|proxy-authorization|cookie|set-cookie|pass|webhook(?:[-_.]?(?:url|uri|endpoint))?|x[-_]?api[-_]?key|client[-_]?key(?:[-_]?data)?|key[-_]?store|pfx|p12|pkcs[-_]?(?:12|#12)|(?:[a-z][a-z0-9]*[-_]?)?(?:token|password|passwd|pwd|passphrase|secret|credential)|(?:[a-z][a-z0-9]*[-_]?)?(?:api|access|account|private|secret|signing|encryption|master|symmetric|subscription)[-_]?key|(?:[a-z][a-z0-9_.-]*)?session[-_]?id|shared[-_]?access[-_]?signature|sas[-_]?token|(?:aws[-_]?)?secret[-_]?access[-_]?key)\b["']?\s*[:=]/i.test(sample)
    );
  }

  function hasSensitiveMetadataAssignmentKey(sample) {
    var assignmentPattern = /(?:^|[^A-Za-z0-9_$.-])["']?([A-Za-z_$][A-Za-z0-9_$.-]{0,120})["']?\s*[:=]/g;
    var assignmentMatch;
    while ((assignmentMatch = assignmentPattern.exec(sample)) !== null) {
      if (isSensitiveMetadataKey(assignmentMatch[1])) return true;
    }
    return false;
  }

  function isSensitiveWhitespaceMetadataAssignment(sample) {
    return (
      /(?:^|\s)(?:-u|-U|--user|--proxy-user)\s+(?:["'][^"'\r\n]*:[^"'\r\n]+["']|[^\s"'`:]+:[^\s"'`;]+)/.test(sample) ||
      hasSensitiveWhitespaceMetadataOption(sample) ||
      /(?:^|[\s"'`;])(?:--?)?(?:auth|authorization|pass|password|passwd|pwd|passphrase|token|secret|credential|api[-_]?key|access[-_]?key)\s+(?:["'][^\r\n]{1,}|[^\s"'`;]{4,})/i.test(sample)
    );
  }

  function hasSensitiveWhitespaceMetadataOption(sample) {
    var optionPattern = /(?:^|[\s"'`;])--?([a-z][a-z0-9_-]{0,80})\s+(?:["'][^\r\n]{1,}|[^\s"'`;]{4,})/gi;
    var optionMatch;
    while ((optionMatch = optionPattern.exec(sample)) !== null) {
      if (isSensitiveMetadataKey(optionMatch[1])) return true;
    }
    return false;
  }

  function isSensitiveMetadataXml(sample, truncated) {
    var sensitiveElement = /<\s*(?:[a-z0-9_.-]+:)?(?:auth|authorization|cookie|pass|webhook(?:[-_.]?(?:url|uri|endpoint))?|client[-_]?key(?:[-_]?data)?|key[-_]?store|pfx|p12|pkcs[-_]?(?:12|#12)|(?:[a-z][a-z0-9]*[-_]?)?(?:token|password|passwd|pwd|passphrase|secret|credential)|(?:[a-z][a-z0-9]*[-_]?)?(?:api|access|account|private|secret|signing|encryption|master|symmetric|subscription)[-_]?key|session[-_]?id|shared[-_]?access[-_]?signature|sas[-_]?token)\b[^>]*>/i;
    if (sensitiveElement.test(sample)) return true;

    var directElementPattern = /<\s*(?:[a-z0-9_.-]+:)?([a-z_][a-z0-9_.-]{0,120})\b[^>]*>/gi;
    var directElementMatch;
    while ((directElementMatch = directElementPattern.exec(sample)) !== null) {
      if (isSensitiveMetadataKey(directElementMatch[1])) return true;
    }

    var tagPattern = /<[^>]*>/g;
    var tagMatch;
    var hasSensitiveAttributeLabel = false;
    while ((tagMatch = tagPattern.exec(sample)) !== null) {
      var tag = tagMatch[0];
      var labelMatch = tag.match(/\b(?:name|key|header|label)\s*=\s*["']([^"']+)["']/i);
      if (labelMatch && isSensitiveMetadataKey(labelMatch[1])) {
        if (/\b(?:value|values|val|data|content|text|default[-_.]?value|current[-_.]?value|raw[-_.]?value)\s*=\s*["'][^"']+/i.test(tag)) {
          return true;
        }
        hasSensitiveAttributeLabel = true;
      }
    }
    var elementLabelPattern = /<\s*(?:[a-z0-9_.-]+:)?(?:name|key|header|label)\s*>\s*(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]+?))\s*<\s*\/\s*(?:[a-z0-9_.-]+:)?(?:name|key|header|label)\s*>/gi;
    var elementLabelMatch;
    var hasSensitiveElementLabel = false;
    while ((elementLabelMatch = elementLabelPattern.exec(sample)) !== null) {
      var elementLabel = elementLabelMatch[1] !== undefined ? elementLabelMatch[1] : elementLabelMatch[2];
      if (isSensitiveMetadataKey(elementLabel.trim())) {
        hasSensitiveElementLabel = true;
        break;
      }
    }
    var hasElementValue = /<\s*(?:[a-z0-9_.-]+:)?(?:value|values|val|data|content|text)\b[^>]*>/i.test(sample);
    if ((hasSensitiveAttributeLabel || hasSensitiveElementLabel) && hasElementValue) return true;
    if (
      truncated &&
      /<\s*(?:[a-z0-9_.-]+:)?(?:value|values|val|data|content|text)\s*>\s*[^<]*$/i.test(sample)
    ) {
      return true;
    }
    var incompleteTagStart = sample.lastIndexOf("<");
    if (
      truncated &&
      incompleteTagStart > sample.lastIndexOf(">") &&
      /\b(?:value|values|val|data|content|text|default[-_.]?value|current[-_.]?value|raw[-_.]?value)\s*=\s*["'][^"']+/i.test(sample.slice(incompleteTagStart))
    ) {
      return true;
    }
    return false;
  }

  function isSerializedSensitiveDescriptor(sample, truncated) {
    if (!/\{\s*(?:["']|[A-Za-z_$])/.test(sample)) return false;
    var labelPattern = /["']?(?:name|key|header|header[-_.]?name|label)["']?\s*:\s*["']([^"']+)["']/gi;
    var labelMatch;
    var hasSensitiveLabel = false;
    while ((labelMatch = labelPattern.exec(sample)) !== null) {
      if (isSensitiveMetadataKey(labelMatch[1])) {
        hasSensitiveLabel = true;
        break;
      }
    }
    var hasAssociatedValue = /["']?(?:value|values|val|data|content|text|header[-_.]?value|default[-_.]?value|current[-_.]?value|raw[-_.]?value)["']?\s*:/i.test(sample);
    if (hasSensitiveLabel && hasAssociatedValue) return true;
    return truncated && (hasSensitiveLabel || hasAssociatedValue);
  }

  function isSerializedSensitiveYamlDescriptor(sample, truncated) {
    if (!/(?:^|[\r\n])\s*(?:-\s*)?(?:name|key|header|header[-_.]?name|label)\s*:/i.test(sample)) {
      return false;
    }
    var labelPattern = /(?:^|[\r\n])\s*(?:-\s*)?(?:name|key|header|header[-_.]?name|label)\s*:\s*["']?([^"'\r\n#]+)["']?/gi;
    var labelMatch;
    var hasSensitiveLabel = false;
    while ((labelMatch = labelPattern.exec(sample)) !== null) {
      if (isSensitiveMetadataKey(labelMatch[1].trim())) {
        hasSensitiveLabel = true;
        break;
      }
    }
    var hasAssociatedValue = /(?:^|[\r\n])\s*(?:-\s*)?(?:value|values|val|data|content|text|header[-_.]?value|default[-_.]?value|current[-_.]?value|raw[-_.]?value)\s*:\s*\S+/i.test(sample);
    if (hasSensitiveLabel && hasAssociatedValue) return true;
    return truncated && (hasSensitiveLabel || hasAssociatedValue);
  }

  function isSerializedSensitiveTuple(sample, truncated) {
    if (!/\[\s*["']/.test(sample)) return false;
    var flattenedPattern = /\[\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']/g;
    var flattenedMatch;
    while ((flattenedMatch = flattenedPattern.exec(sample)) !== null) {
      var firstKey = flattenedMatch[1].toLowerCase().replace(/[-_.\s]/g, "");
      var secondKey = flattenedMatch[3].toLowerCase().replace(/[-_.\s]/g, "");
      var hasSensitiveLabel =
        (/^(?:name|key|header|headername|label)$/.test(firstKey) && isSensitiveMetadataKey(flattenedMatch[2])) ||
        (/^(?:name|key|header|headername|label)$/.test(secondKey) && isSensitiveMetadataKey(flattenedMatch[4]));
      var hasAssociatedValue =
        /^(?:value|values|val|data|content|text|headervalue|defaultvalue|currentvalue|rawvalue)$/.test(firstKey) ||
        /^(?:value|values|val|data|content|text|headervalue|defaultvalue|currentvalue|rawvalue)$/.test(secondKey);
      if (hasSensitiveLabel && hasAssociatedValue) return true;
    }
    if (truncated) {
      var truncatedFlattenedPattern = /\[\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*["']([^"']+)["']\s*,\s*["']([^"']*)$/g;
      var truncatedFlattenedMatch;
      while ((truncatedFlattenedMatch = truncatedFlattenedPattern.exec(sample)) !== null) {
        var firstTruncatedKey = truncatedFlattenedMatch[1].toLowerCase().replace(/[-_.\s]/g, "");
        var secondTruncatedKey = truncatedFlattenedMatch[3].toLowerCase().replace(/[-_.\s]/g, "");
        var hasTruncatedSensitiveLabel =
          (/^(?:name|key|header|headername|label)$/.test(firstTruncatedKey) && isSensitiveMetadataKey(truncatedFlattenedMatch[2])) ||
          (/^(?:name|key|header|headername|label)$/.test(secondTruncatedKey) && isSensitiveMetadataKey(truncatedFlattenedMatch[4]));
        var hasTruncatedValueSlot =
          /^(?:value|values|val|data|content|text|headervalue|defaultvalue|currentvalue|rawvalue)$/.test(firstTruncatedKey) ||
          /^(?:value|values|val|data|content|text|headervalue|defaultvalue|currentvalue|rawvalue)$/.test(secondTruncatedKey);
        if (hasTruncatedSensitiveLabel && hasTruncatedValueSlot) return true;
      }
    }
    var tuplePattern = /\[\s*["']([^"']+)["']\s*,\s*["'][^"']*/g;
    var tupleMatch;
    while ((tupleMatch = tuplePattern.exec(sample)) !== null) {
      if (isSensitiveMetadataKey(tupleMatch[1])) return true;
    }
    return false;
  }

  function isSerializedPrivateJwk(sample, truncated) {
    if (!/\{\s*["']/.test(sample)) return false;
    var keyTypeMatch = sample.match(/["']kty["']\s*:\s*["'](rsa|ec|okp|oct)["']/i);
    var hasPrivateMember = /["'](?:d|p|q|dp|dq|qi|oth)["']\s*:/.test(sample);
    var hasSymmetricKey = /["']k["']\s*:/.test(sample);

    if (keyTypeMatch) {
      var keyType = keyTypeMatch[1].toLowerCase();
      if (keyType === "oct" && hasSymmetricKey) return true;
      if (keyType !== "oct" && hasPrivateMember) return true;
    }
    return truncated && Boolean(keyTypeMatch || hasPrivateMember || hasSymmetricKey);
  }

  function normalizeMetadataUrlDelimiters(value) {
    var result = value;
    for (var pass = 0; pass < 3; pass += 1) {
      var normalized = result
        .replace(/%25/gi, "%")
        .replace(/%2f/gi, "/")
        .replace(/%3a/gi, ":")
        .replace(/%40/gi, "@")
        .replace(/%3f/gi, "?")
        .replace(/%26/gi, "&")
        .replace(/%3d/gi, "=")
        .replace(/%([0-9a-f]{2})/gi, function (_, hex) {
          return String.fromCharCode(parseInt(hex, 16));
        });
      if (normalized === result) break;
      result = normalized;
    }
    return result;
  }

  function isSensitiveNameValueTuple(value) {
    var visibleLength = Math.min(value.length, CONFIG.METADATA_MAX_ARRAY_ITEMS);
    var hasSensitiveDescriptorLabel = false;
    var hasDescriptorValue = false;
    for (var index = 0; index + 1 < visibleLength; index += 2) {
      try {
        if (isSensitiveMetadataKey(value[index])) return true;
        var descriptorKey = String(value[index]).toLowerCase().replace(/[-_.\s]/g, "");
        if (/^(?:name|key|header|headername|label)$/.test(descriptorKey)) {
          hasSensitiveDescriptorLabel = isSensitiveMetadataKey(value[index + 1]) || hasSensitiveDescriptorLabel;
        }
        if (/^(?:value|values|val|data|content|text|headervalue|defaultvalue|currentvalue|rawvalue)$/.test(descriptorKey)) {
          hasDescriptorValue = true;
        }
      } catch (_) {
        return true;
      }
    }
    return hasSensitiveDescriptorLabel && hasDescriptorValue;
  }

  function isLikelyRowArray(key, value) {
    if (!Array.isArray(value) || value.length === 0) return false;
    if (/(?:fields?|columns?|headers?|schema|metadata|definitions?|dimensions?|measures?|metrics?|bindings?|calculations?|formulas?|expressions?|aggregates?|aggregations?|functions?|choices?|options?|enums?|categories?|labels?|roles?|types?|aliases?)/i.test(String(key))) {
      return false;
    }
    var visibleLength = Math.min(value.length, CONFIG.METADATA_MAX_ARRAY_ITEMS);
    var inspected = 0;
    var hasScalarValue = false;
    for (var index = 0; index < visibleLength; index += 1) {
      if (value[index] === null || typeof value[index] === "undefined") continue;
      inspected += 1;
      if (isPlainObject(value[index]) || Array.isArray(value[index])) return true;
      hasScalarValue = true;
      if (inspected >= 3) break;
    }
    return hasScalarValue;
  }

  function isNonEmptyStringArray(value) {
    if (!Array.isArray(value) || value.length === 0) return false;
    var visibleLength = Math.min(value.length, CONFIG.METADATA_MAX_ARRAY_ITEMS);
    for (var index = 0; index < visibleLength; index += 1) {
      if (typeof value[index] !== "string") return false;
    }
    return true;
  }

  function isJsonSchemaShapedObject(value) {
    try {
      var schemaType = value.type;
      return (
        (typeof schemaType === "string" && /^(?:object|array)$/i.test(schemaType)) ||
        (
          Array.isArray(schemaType) &&
          schemaType.some(function (type) {
            return typeof type === "string" && /^(?:object|array)$/i.test(type);
          })
        ) ||
        isPlainObject(value.properties) ||
        isPlainObject(value.items) ||
        typeof value.$ref === "string" ||
        isPlainObject(value.$defs) ||
        isPlainObject(value.definitions) ||
        isPlainObject(value.patternProperties) ||
        isPlainObject(value.dependentSchemas) ||
        isJsonSchemaArrayOfSchemas(value.oneOf) ||
        isJsonSchemaArrayOfSchemas(value.anyOf) ||
        isJsonSchemaArrayOfSchemas(value.allOf) ||
        isJsonSchemaArrayOfSchemas(value.prefixItems) ||
        typeof value.$schema === "string"
      );
    } catch (_) {
      return false;
    }
  }

  function getJsonSchemaChildContext(parent, key, value) {
    if (!isPlainObject(value) || !isJsonSchemaShapedObject(parent)) return null;
    if (/^dependentrequired$/i.test(String(key))) return "dependentRequired";
    if (/^properties$/i.test(String(key))) return "properties";
    if (/^(?:\$defs|definitions|patternproperties|dependentschemas)$/i.test(String(key))) return "definitions";
    return null;
  }

  function isJsonSchemaArrayOfSchemas(value) {
    if (!Array.isArray(value)) return false;
    var visibleLength = Math.min(value.length, CONFIG.METADATA_MAX_ARRAY_ITEMS);
    var hasSchema = false;
    for (var index = 0; index < visibleLength; index += 1) {
      if (value[index] === null || typeof value[index] === "undefined") continue;
      if (typeof value[index] !== "boolean" && !isPlainObject(value[index])) return false;
      hasSchema = true;
    }
    return hasSchema;
  }

  function isJsonSchemaStructureProperty(parent, key, value) {
    var text = String(key);
    if (/^required$/i.test(text) && isNonEmptyStringArray(value)) {
      return isJsonSchemaShapedObject(parent);
    }
    if (/^(?:oneof|anyof|allof|prefixitems)$/i.test(text)) return isJsonSchemaArrayOfSchemas(value);
    if (
      !/^items$/i.test(text) ||
      (!isPlainObject(value) && typeof value !== "boolean" && !isJsonSchemaArrayOfSchemas(value))
    ) return false;
    try {
      if (typeof parent.type === "string") {
        return parent.type.toLowerCase() === "array";
      }
      if (Array.isArray(parent.type)) {
        return parent.type.some(function (type) {
          return typeof type === "string" && type.toLowerCase() === "array";
        });
      }
    } catch (_) {
      return false;
    }
    return false;
  }

  function isStructuralScalarMetadataProperty(parent, key, value) {
    if (!/^(?:value|val)$/i.test(String(key))) return false;
    if (value !== null && (typeof value === "object" || typeof value === "function")) return false;
    var label;
    try {
      if (Object.prototype.hasOwnProperty.call(parent, "label")) {
        label = parent.label;
      } else if (Object.prototype.hasOwnProperty.call(parent, "name")) {
        label = parent.name;
      } else {
        return false;
      }
      return typeof label === "string" && !isSensitiveMetadataKey(label);
    } catch (_) {
      return false;
    }
  }

  function isSensitiveNamedValueDescriptor(value) {
    var hasSensitiveName = false;
    var hasAssociatedValue = false;
    var scanned = 0;
    try {
      for (var key in value) {
        scanned += 1;
        if (scanned > CONFIG.METADATA_MAX_SCANNED_OBJECT_KEYS) {
          return hasSensitiveName || hasAssociatedValue;
        }
        if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
        var normalizedKey = String(key).toLowerCase().replace(/[-_.\s]/g, "");
        if (/^(?:value|values|val|data|content|text|headervalue|defaultvalue|currentvalue|rawvalue)$/.test(normalizedKey)) {
          hasAssociatedValue = true;
        }
        if (!/^(?:name|key|header|headername|label)$/.test(normalizedKey)) continue;
        try {
          if (isSensitiveMetadataKey(value[key])) hasSensitiveName = true;
        } catch (_) {
          hasSensitiveName = true;
        }
        if (hasSensitiveName && hasAssociatedValue) return true;
      }
    } catch (_) {
      return true;
    }
    return hasSensitiveName && hasAssociatedValue;
  }

  function isPrivateJwk(value) {
    var keyType = "";
    var hasPrivateMember = false;
    var hasSymmetricKey = false;
    var scanned = 0;

    try {
      for (var key in value) {
        scanned += 1;
        if (scanned > CONFIG.METADATA_MAX_SCANNED_OBJECT_KEYS) {
          return Boolean(keyType || hasPrivateMember || hasSymmetricKey);
        }
        if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
        var normalizedKey = String(key).toLowerCase();
        if (normalizedKey === "kty") {
          keyType = String(value[key]).toLowerCase();
        } else if (/^(?:d|p|q|dp|dq|qi|oth)$/.test(normalizedKey)) {
          hasPrivateMember = true;
        } else if (normalizedKey === "k") {
          hasSymmetricKey = true;
        }
      }
    } catch (_) {
      return true;
    }

    return (
      (keyType === "oct" && hasSymmetricKey) ||
      (Boolean(keyType) && hasPrivateMember)
    );
  }

  function collectBoundedMetadataObjectKeys(value) {
    var keys = [];
    var scanned = 0;
    var truncated = false;
    var unreadable = false;

    try {
      for (var key in value) {
        scanned += 1;
        if (scanned > CONFIG.METADATA_MAX_SCANNED_OBJECT_KEYS) {
          truncated = true;
          break;
        }
        if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
        if (isSensitiveMetadataKey(key) || isSensitiveMetadataString(String(key))) continue;
        if (keys.length >= CONFIG.METADATA_MAX_OBJECT_KEYS) {
          truncated = true;
          break;
        }
        keys.push(key);
      }
    } catch (_) {
      unreadable = true;
      truncated = true;
    }

    keys.sort();
    return {
      keys: keys,
      truncated: truncated,
      unreadable: unreadable
    };
  }

  function consumeMetadataNode(budget) {
    if (budget.nodes >= CONFIG.METADATA_MAX_TOTAL_NODES) {
      budget.truncated = true;
      budget.exhausted = true;
      return false;
    }
    budget.nodes += 1;
    return true;
  }

  function consumeMetadataChars(budget, count) {
    if (budget.chars + count > CONFIG.METADATA_MAX_TOTAL_CHARS) {
      budget.truncated = true;
      budget.exhausted = true;
      return false;
    }
    budget.chars += count;
    return true;
  }

  function truncateMetadataKey(key) {
    var text = String(key);
    if (isSensitiveMetadataString(text)) return "[已省略可能包含凭证的键]";
    return text.length > CONFIG.METADATA_MAX_KEY_CHARS
      ? text.slice(0, CONFIG.METADATA_MAX_KEY_CHARS) + "...[键已截断]"
      : text;
  }

  function makeUniqueMetadataOutputKeys(keys) {
    var used = Object.create(null);
    return keys.map(function (key) {
      var base = truncateMetadataKey(key);
      var outputKey = base;
      var suffix = 2;
      while (Object.prototype.hasOwnProperty.call(used, outputKey)) {
        outputKey = base + "#" + suffix;
        suffix += 1;
      }
      used[outputKey] = true;
      return outputKey;
    });
  }

  function stringifyMetadataDiagnostic(diagnostic) {
    var text = JSON.stringify(diagnostic, null, 2);
    if (text.length <= CONFIG.METADATA_MAX_JSON_CHARS) return text;

    var fallbackText = JSON.stringify({
      schemaVersion: diagnostic.schemaVersion,
      optionsKeys: diagnostic.optionsKeys,
      metadataCandidateKeys: diagnostic.metadataCandidateKeys,
      omittedRowCandidateKeys: diagnostic.omittedRowCandidateKeys,
      optionKeyScan: diagnostic.optionKeyScan,
      boundSources: diagnostic.boundSources.slice(0, CONFIG.METADATA_MAX_OPTION_KEYS).map(truncateMetadataKey),
      metadata: {"__truncated": "诊断超过最终 JSON 限制，元数据内容已省略"},
      limits: diagnostic.limits,
      budget: {
        nodes: diagnostic.budget.nodes,
        chars: diagnostic.budget.chars,
        truncated: true,
        exhausted: true
      },
      safety: diagnostic.safety
    }, null, 2);
    if (fallbackText.length <= CONFIG.METADATA_MAX_JSON_CHARS) return fallbackText;

    var minimalText = JSON.stringify({
      schemaVersion: 1,
      metadata: {"__truncated": "诊断超过最终 JSON 限制，详细内容已省略"},
      limits: {maxJsonChars: CONFIG.METADATA_MAX_JSON_CHARS},
      budget: {truncated: true, exhausted: true},
      safety: "诊断已缩减以满足最终 JSON 长度限制；不包含行值或凭证。"
    }, null, 2);
    if (minimalText.length <= CONFIG.METADATA_MAX_JSON_CHARS) return minimalText;
    return "{\"schemaVersion\":1,\"metadata\":{\"__truncated\":\"diagnostic omitted\"}}";
  }

  function describeOmittedRowData(value) {
    if (Array.isArray(value)) return "[已省略潜在行数据：数组 " + value.length + " 项]";
    if (value && typeof value === "object") return "[已省略潜在行数据：对象]";
    return "[已省略潜在行数据]";
  }

  function isDomLike(value) {
    if (!value || typeof value !== "object") return false;
    if (typeof window !== "undefined" && value === window) return true;
    if (typeof document !== "undefined" && value === document) return true;
    return (
      typeof value.nodeType === "number" ||
      (typeof value.nodeName === "string" && value.ownerDocument)
    );
  }

  function isArrayBufferView(value) {
    try {
      return (
        typeof ArrayBuffer !== "undefined" &&
        typeof ArrayBuffer.isView === "function" &&
        ArrayBuffer.isView(value)
      );
    } catch (_) {
      return true;
    }
  }

  async function copyTextToClipboard(text) {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_) {}
    }

    var textarea;
    try {
      textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "readonly");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      container.appendChild(textarea);
      textarea.focus();
      textarea.select();
      return !!(document.execCommand && document.execCommand("copy"));
    } catch (_) {
      return false;
    } finally {
      if (textarea && textarea.parentNode === container) container.removeChild(textarea);
    }
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
