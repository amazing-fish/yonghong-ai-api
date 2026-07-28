"use strict";

const assert = require("assert");
const path = require("path");

async function main() {
  const elements = Object.create(null);
  const appended = [];
  let rendered = false;
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
      if (!elements[selector]) elements[selector] = {};
      return elements[selector];
    },
  };
  Object.defineProperty(container, "innerHTML", {
    set() {
      rendered = true;
    },
  });

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
    ],
    rows: [{name: "SECRET_NESTED_ROW"}],
    longLabel: "x".repeat(600),
    choices: ["a", "b", "c", "d", "e", "f"],
  };
  fieldMeta.self = fieldMeta;

  global.$container = "metadata-harness-component";
  global.options = {
    data: [{column1: "SECRET_ROW_VALUE"}],
    column1: ["SECRET_COLUMN_VALUE"],
    fieldMeta,
    qinfo: {
      headers: [{name: "failure_rate", type: "double"}],
      cookie: "SECRET_COOKIE",
      samples: [{name: "SECRET_SAMPLE"}],
    },
    auth: "SECRET_AUTH",
    sessionToken: "SECRET_TOP_LEVEL_TOKEN",
    renderHelper() {},
    chartElement: {nodeType: 1, nodeName: "DIV"},
  };

  require(path.resolve(__dirname, "../component/yonghong_ai_component.js"));
  await elements['[data-action="copyMetadata"]'].onclick();

  assert.ok(clipboardText, "diagnostic should be copied");
  const diagnostic = JSON.parse(clipboardText);

  assert.deepStrictEqual(diagnostic.metadataCandidateKeys, ["fieldMeta", "qinfo"]);
  assert.deepStrictEqual(diagnostic.boundSources, ["column1"]);
  assert.strictEqual(diagnostic.metadata.fieldMeta.fields[0].name, "failure_rate");
  assert.strictEqual(diagnostic.metadata.fieldMeta.fields[0].formula, "failure_count / total_count");
  assert.strictEqual(diagnostic.metadata.fieldMeta.self, "[循环引用]");
  assert.strictEqual(diagnostic.metadata.fieldMeta.choices.length, 6);
  assert.match(diagnostic.metadata.fieldMeta.choices[5], /其余 1 项已省略/);
  assert.match(diagnostic.metadata.fieldMeta.longLabel, /已截断/);
  assert.match(diagnostic.metadata.fieldMeta.rows, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.samples, /已省略潜在行数据/);
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.qinfo, "cookie"));

  [
    "SECRET_ROW_VALUE",
    "SECRET_COLUMN_VALUE",
    "SECRET_NESTED_ROW",
    "SECRET_FIELD_TOKEN",
    "SECRET_COOKIE",
    "SECRET_SAMPLE",
    "SECRET_TOP_LEVEL_TOKEN",
    "SECRET_AUTH",
  ].forEach((secret) => {
    assert.ok(!clipboardText.includes(secret), `diagnostic leaked ${secret}`);
  });

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
