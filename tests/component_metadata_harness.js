"use strict";

const assert = require("assert");
const path = require("path");

async function main() {
  const elements = Object.create(null);
  const appended = [];
  let rendered = true;
  let legacyUi = true;
  let renderResetCount = 0;
  let clipboardText = "";

  const container = {
    style: {},
    appendChild(node) {
      appended.push(node);
      node.parentNode = container;
    },
    removeChild(node) {
      const index = appended.indexOf(node);
      if (index >= 0) appended.splice(index, 1);
      node.parentNode = null;
    },
    querySelector(selector) {
      if (!rendered) return null;
      if (legacyUi && selector === '[data-action="copyMetadata"]') return null;
      if (!elements[selector]) elements[selector] = {};
      return elements[selector];
    },
  };
  Object.defineProperty(container, "innerHTML", {
    set() {
      rendered = true;
      legacyUi = false;
      renderResetCount += 1;
    },
  });
  container.__yhAiState = {
    initialized: true,
    busy: false,
    boundRows: [],
    boundFields: [],
    history: [],
    settings: {
      mode: "options_data",
      dataset: "event_summary",
      fieldDefinitions: [],
      action: "",
      xmlData: "",
      params: {},
      rowsPath: "",
    },
  };

  global.document = {
    title: "metadata harness",
    getElementById() {
      return container;
    },
    createElement() {
      return {
        style: {},
        appendChild() {},
        setAttribute() {},
        focus() {},
        select() {},
      };
    },
    execCommand() {
      return false;
    },
  };
  global.window = {
    location: {
      search: "?db=metadata-harness.db",
      pathname: "/bi/Viewer",
    },
  };
  global.location = global.window.location;
  global.localStorage = {
    getItem() {
      return null;
    },
    setItem() {},
  };
  Object.defineProperty(global, "navigator", {
    configurable: true,
    value: {
      clipboard: {
        async writeText(value) {
          clipboardText = value;
        },
      },
    },
  });

  const fieldMeta = {
    fields: [
      {
        name: "failure_rate",
        alias: "失败率",
        role: "measure",
        formula: "failure_count / total_count",
        accessToken: "SECRET_FIELD_TOKEN",
      },
      {
        name: "jwt",
        value: "SECRET_DESCRIPTOR_JWT",
      },
      {
        name: "Authorization",
        val: "OPAQUE_VAL_SECRET",
      },
    ],
    rows: [{name: "SECRET_NESTED_ROW"}],
    longLabel: "x".repeat(600),
    choices: ["a", "b", "c", "d", "e", "f"],
  };
  fieldMeta.self = fieldMeta;

  let schemaMeta = "leaf";
  for (let depth = 0; depth < 4; depth += 1) {
    const level = {};
    for (let index = 0; index < 30; index += 1) {
      level[`branch_${depth}_${index}`] = schemaMeta;
    }
    schemaMeta = level;
  }

  const hugeMeta = {};
  for (let index = 0; index < 31; index += 1) {
    hugeMeta[`key_${String(index).padStart(2, "0")}`] = `metadata_${index}`;
  }

  global.$container = "metadata-harness-component";
  const runtimeOptions = {
    data: [{column1: "SECRET_ROW_VALUE"}],
    column1: ["SECRET_COLUMN_VALUE"],
  };
  for (let index = 0; index < 150; index += 1) {
    runtimeOptions[`a_option_${String(index).padStart(3, "0")}`] = index;
  }
  const oversizedSource = `column${"9".repeat(40000)}`;
  runtimeOptions[oversizedSource] = [];
  Object.assign(runtimeOptions, {
    fieldMeta,
    hugeMeta,
    qinfo: {
      headers: [
        {name: "failure_rate", type: "double"},
        {name: "Authorization", value: "SECRET_DESCRIPTOR_AUTH"},
        {key: "sessionToken", value: "SECRET_DESCRIPTOR_TOKEN"},
        ["Authorization", "SECRET_TUPLE_AUTH"],
        ["sessionToken", "SECRET_TUPLE_TOKEN"],
      ],
      headerLines: [
        "Authorization: Bearer SECRET_RAW_ARRAY_AUTH",
        "Cookie: YHBISESSIONID=SECRET_RAW_ARRAY_COOKIE",
        "Content-Type: application/json",
      ],
      jwt: "SECRET_JWT_KEY",
      pwd: "OPAQUE_PWD_VALUE",
      passwd: "OPAQUE_PASSWD_VALUE",
      passphrase: "OPAQUE_PASSPHRASE_VALUE",
      note: "eyJhbGciOiJIUzI1NiJ9.eyJzZWNyZXQiOiJTRUNSRVRfUkFXX0pXVCJ9.signature123",
      connection: "UID=user;PWD=OPAQUE_CONNECTION_SECRET",
      recordList: [{name: "SECRET_NESTED_RECORD_LIST"}],
      fieldItems: [{name: "SECRET_NESTED_FIELD_ITEMS"}],
      resultSet: [{name: "SECRET_NESTED_RESULT_SET"}],
      recordSet: [{name: "SECRET_NESTED_RECORD_SET"}],
      numericPrecision: 10n ** 10000n,
      marker: Symbol("SECRET_SYMBOL_DESCRIPTION"),
      encryptionKey: "OPAQUE_ENCRYPTION_KEY",
      signingKey: "OPAQUE_SIGNING_KEY",
      cookie: "SECRET_COOKIE",
      samples: [{name: "SECRET_SAMPLE"}],
      queryData: [{name: "SECRET_NESTED_QUERY_ROW"}],
      metadataRows: [{name: "SECRET_NESTED_METADATA_ROW"}],
      fieldData: [{name: "SECRET_NESTED_FIELD_ROW"}],
    },
    auth: "SECRET_AUTH",
    sessionToken: "SECRET_TOP_LEVEL_TOKEN",
    queryData: [{name: "SECRET_QUERY_ROW"}],
    queryList: [{name: "SECRET_QUERY_LIST"}],
    queryResultSet: [{name: "SECRET_QUERY_RESULT_SET"}],
    metadataRows: [{name: "SECRET_METADATA_ROW"}],
    headers: "Authorization: Bearer SECRET_RAW_HEADER",
    schemaMeta,
    renderHelper() {},
    chartElement: {nodeType: 1, nodeName: "DIV"},
  });
  global.options = runtimeOptions;

  require(path.resolve(__dirname, "../component/yonghong_ai_component.js"));
  assert.strictEqual(renderResetCount, 1, "legacy UI should be rebuilt for the metadata action");
  await elements['[data-action="copyMetadata"]'].onclick();

  assert.ok(clipboardText, "diagnostic should be copied");
  const diagnostic = JSON.parse(clipboardText);

  assert.deepStrictEqual(
    diagnostic.metadataCandidateKeys,
    ["fieldMeta", "headers", "hugeMeta", "qinfo", "schemaMeta"],
  );
  assert.deepStrictEqual(
    diagnostic.omittedRowCandidateKeys,
    ["metadataRows", "queryData", "queryList", "queryResultSet"],
  );
  assert.ok(!diagnostic.optionsKeys.includes("fieldMeta"));
  assert.strictEqual(diagnostic.optionKeyScan.displayTruncated, true);
  assert.strictEqual(diagnostic.optionKeyScan.scanTruncated, false);
  assert.strictEqual(diagnostic.boundSources[0], "column1");
  assert.match(diagnostic.boundSources[1], /\[键已截断\]$/);
  assert.ok(diagnostic.boundSources[1].length < 200);
  assert.strictEqual(diagnostic.limits.maxKeyChars, 120);
  assert.strictEqual(diagnostic.metadata.fieldMeta.fields[0].name, "failure_rate");
  assert.strictEqual(diagnostic.metadata.fieldMeta.fields[0].formula, "failure_count / total_count");
  assert.strictEqual(diagnostic.metadata.fieldMeta.self, "[循环引用]");
  assert.strictEqual(diagnostic.metadata.fieldMeta.choices.length, 6);
  assert.match(diagnostic.metadata.fieldMeta.choices[5], /其余 1 项已省略/);
  assert.match(diagnostic.metadata.fieldMeta.longLabel, /已截断/);
  assert.match(diagnostic.metadata.fieldMeta.rows, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.fieldMeta.fields[1], /已省略敏感名称\/值描述符/);
  assert.match(diagnostic.metadata.fieldMeta.fields[2], /已省略敏感名称\/值描述符/);
  assert.match(diagnostic.metadata.qinfo.samples, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.queryData, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.metadataRows, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.fieldData, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.headers[1], /已省略敏感名称\/值描述符/);
  assert.match(diagnostic.metadata.qinfo.headers[2], /已省略敏感名称\/值描述符/);
  assert.match(diagnostic.metadata.qinfo.headers[3], /已省略敏感名称\/值元组/);
  assert.match(diagnostic.metadata.qinfo.headers[4], /已省略敏感名称\/值元组/);
  assert.match(diagnostic.metadata.qinfo.headerLines[0], /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.qinfo.headerLines[1], /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.qinfo.note, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.qinfo.connection, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.qinfo.recordList, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.fieldItems, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.resultSet, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.recordSet, /已省略潜在行数据/);
  assert.strictEqual(diagnostic.metadata.qinfo.numericPrecision, "[已省略 BigInt]");
  assert.strictEqual(diagnostic.metadata.qinfo.marker, "[已省略 Symbol]");
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.qinfo, "jwt"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.qinfo, "pwd"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.qinfo, "passwd"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.qinfo, "passphrase"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.qinfo, "encryptionKey"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.qinfo, "signingKey"));
  assert.match(diagnostic.metadata.headers, /已省略可能包含凭证的字符串/);
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.qinfo, "cookie"));
  assert.strictEqual(diagnostic.metadata.hugeMeta.__truncatedKeys, true);
  assert.strictEqual(
    Object.keys(diagnostic.metadata.hugeMeta).filter((key) => key !== "__truncatedKeys").length,
    30,
  );
  assert.strictEqual(diagnostic.budget.exhausted, true);
  assert.ok(clipboardText.length <= diagnostic.limits.maxJsonChars);

  [
    "SECRET_ROW_VALUE",
    "SECRET_COLUMN_VALUE",
    "SECRET_NESTED_ROW",
    "SECRET_FIELD_TOKEN",
    "SECRET_COOKIE",
    "SECRET_SAMPLE",
    "SECRET_TOP_LEVEL_TOKEN",
    "SECRET_AUTH",
    "SECRET_QUERY_ROW",
    "SECRET_METADATA_ROW",
    "SECRET_NESTED_QUERY_ROW",
    "SECRET_NESTED_METADATA_ROW",
    "SECRET_NESTED_FIELD_ROW",
    "SECRET_DESCRIPTOR_AUTH",
    "SECRET_DESCRIPTOR_TOKEN",
    "SECRET_TUPLE_AUTH",
    "SECRET_TUPLE_TOKEN",
    "SECRET_RAW_ARRAY_AUTH",
    "SECRET_RAW_ARRAY_COOKIE",
    "SECRET_RAW_HEADER",
    "SECRET_DESCRIPTOR_JWT",
    "SECRET_JWT_KEY",
    "SECRET_RAW_JWT",
    "OPAQUE_VAL_SECRET",
    "OPAQUE_PWD_VALUE",
    "OPAQUE_PASSWD_VALUE",
    "OPAQUE_PASSPHRASE_VALUE",
    "OPAQUE_CONNECTION_SECRET",
    "SECRET_QUERY_LIST",
    "SECRET_NESTED_RECORD_LIST",
    "SECRET_NESTED_FIELD_ITEMS",
    "SECRET_NESTED_RESULT_SET",
    "SECRET_NESTED_RECORD_SET",
    "SECRET_QUERY_RESULT_SET",
    "SECRET_SYMBOL_DESCRIPTION",
    "OPAQUE_ENCRYPTION_KEY",
    "OPAQUE_SIGNING_KEY",
  ].forEach((secret) => {
    assert.ok(!clipboardText.includes(secret), `diagnostic leaked ${secret}`);
  });

  Object.keys(runtimeOptions).forEach((key) => {
    delete runtimeOptions[key];
  });
  runtimeOptions.data = [];
  for (let index = 0; index < 60; index += 1) {
    runtimeOptions[`option_${String(index).padStart(3, "0")}_${"x".repeat(130)}`] = {};
  }
  for (let index = 0; index < 20; index += 1) {
    runtimeOptions[`field_${String(index).padStart(3, "0")}_${"m".repeat(130)}_meta`] = {};
    runtimeOptions[`field_${String(index).padStart(3, "0")}_${"d".repeat(130)}_data`] = [];
  }
  global.options = runtimeOptions;
  container.__yhAiState.boundFields = Array.from({length: 100}, (_, index) => {
    const source = `column${String(index).padStart(3, "0")}${"9".repeat(130)}`;
    return {source, name: source, role: "unknown"};
  });
  await elements['[data-action="copyMetadata"]'].onclick();

  const minimalDiagnostic = JSON.parse(clipboardText);
  assert.ok(clipboardText.length <= 32000);
  assert.match(minimalDiagnostic.metadata.__truncated, /最终 JSON 限制/);
  assert.ok(!Object.prototype.hasOwnProperty.call(minimalDiagnostic, "optionsKeys"));

  global.navigator.clipboard.writeText = async function () {
    throw new Error("clipboard denied");
  };
  await elements['[data-action="copyMetadata"]'].onclick();

  assert.strictEqual(
    elements['[data-field="debug"]'].textContent,
    clipboardText,
    "diagnostic should remain visible when clipboard access is denied",
  );
  assert.strictEqual(
    elements['[data-field="status"]'].textContent,
    "已生成元数据诊断，请从下方手动复制",
  );
  console.log("component metadata diagnostics passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
