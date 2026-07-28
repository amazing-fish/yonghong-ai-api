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

  const truncatedDescriptor = {value: "OPAQUE_TRUNCATED_DESCRIPTOR"};
  for (let index = 0; index < 205; index += 1) {
    truncatedDescriptor[`filler_${index}`] = index;
  }
  truncatedDescriptor.name = "Authorization";

  const fieldMeta = {
    arrayTypeSchema: {
      type: ["object", "null"],
      required: ["id"],
    },
    cookieHeader: "SID=OPAQUE_GENERIC_SESSION",
    dimensionMembers: [{caption: "SECRET_DIMENSION_MEMBER"}],
    dimensionMembersById: {member_1: {caption: "SECRET_DIMENSION_MEMBER_BY_ID"}},
    dimensionValuesById: {value_1: {caption: "SECRET_DIMENSION_VALUE_BY_ID"}},
    hierarchyNodesById: {node_1: {caption: "SECRET_HIERARCHY_NODE_BY_ID"}},
    memberCache: {member_3: {caption: "SECRET_MEMBER_CACHE"}},
    memberMap: {member_2: {caption: "SECRET_MEMBER_MAP"}},
    sessionCookie: "SID=OPAQUE_SESSION_COOKIE_VALUE",
    signatureHeaders: {
      "X-Amz-Signature": "OPAQUE_AWS_HEADER_SIGNATURE",
      "X-Goog-Signature": "OPAQUE_GOOGLE_HEADER_SIGNATURE",
    },
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
      {
        Key: "Authorization",
        Value: "OPAQUE_DOTNET_DESCRIPTOR",
      },
      truncatedDescriptor,
    ],
    rows: [{name: "SECRET_NESTED_ROW"}],
    choiceDefinitions: [{label: "Enabled", value: "enabled"}],
    headerDescriptor: {
      headerName: "Authorization",
      headerValue: "OPAQUE_HEADER_VALUE_DESCRIPTOR",
    },
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
  const inheritedMetadataPrototype = {};
  for (let index = 0; index < 250; index += 1) {
    inheritedMetadataPrototype[`inherited_${index}`] = `SECRET_INHERITED_META_${index}`;
  }
  const prototypeMeta = Object.create(inheritedMetadataPrototype);

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
  const collisionPrefix = `formula${"x".repeat(130)}`;
  const collisionKeyA = `${collisionPrefix}A`;
  const collisionKeyB = `${collisionPrefix}B`;
  runtimeOptions[collisionKeyA] = {expression: "FIRST_COLLISION_FORMULA"};
  runtimeOptions[collisionKeyB] = {expression: "SECOND_COLLISION_FORMULA"};
  runtimeOptions.aggregateFunctions = ["SUM", "AVG"];
  runtimeOptions.aggregations = [{name: "SUM"}];
  runtimeOptions.authorFieldMetadata = {fields: [{name: "author"}]};
  runtimeOptions.fieldList = [
    {name: "region", role: "dimension"},
    {name: "revenue", role: "measure"},
  ];
  runtimeOptions.formulaExpressions = ["failure_count / total_count", "revenue - cost"];
  runtimeOptions.roles = ["dimension", "measure"];

  const primaryDate = new Date("2026-07-28T00:00:00.000Z");
  primaryDate.toISOString = () => "Bearer OPAQUE_DATE_ISO_TOKEN";
  const fallbackDate = new Date("2026-07-28T00:00:00.000Z");
  fallbackDate.toISOString = () => {
    throw new Error("forced date fallback");
  };
  fallbackDate.toString = () => "redis://:OPAQUE_DATE_FALLBACK_PASSWORD@example.com/0";

  Object.assign(runtimeOptions, {
    configMeta: {
      boxedSettings: new String("password=OPAQUE_BOXED_STRING_PASSWORD"),
      commandSettings: "oauth2-proxy --client-secret OPAQUE_CLIENT_SECRET",
      connectionDsn: "demo:OPAQUE_SCHEMELESS_DSN_PASSWORD@tcp(db:3306)/app",
      connectionSettings: "{\"user\":\"demo\",\"pass\":\"OPAQUE_SERIALIZED_PASS_VALUE\"}",
      cryptographySettings: "{\"consumerKey\":\"OPAQUE_CONSUMER_KEY_VALUE\",\"tlsKey\":\"OPAQUE_TLS_KEY_VALUE\",\"secretKey\":\"OPAQUE_SECRET_KEY_VALUE\",\"privateKey\":\"OPAQUE_PRIVATE_KEY_VALUE\"}",
      databaseSettings: "{\"dbPassword\":\"OPAQUE_CAMEL_DB_PASSWORD\",\"databasePassword\":\"OPAQUE_CAMEL_DATABASE_PASSWORD\"}",
      mailSettings: {
        smtpPass: "OPAQUE_CAMEL_SMTP_PASS",
        apiKeys: {production: "OPAQUE_API_KEY"},
        apiKeysByTenant: {production: "OPAQUE_TENANT_API_KEY"},
        accessTokens: {production: "OPAQUE_ACCESS_TOKEN"},
        accessTokensByUser: {alice: "OPAQUE_USER_ACCESS_TOKEN"},
        accessTokenString: "OPAQUE_ACCESS_TOKEN_STRING",
        authorizationCode: "OPAQUE_AUTHORIZATION_CODE_FIELD",
        YHBISESSIONID: "OPAQUE_YONGHONG_SESSION",
        DBPASS: "OPAQUE_UPPERCASE_DB_PASS",
        MAILPASS: "OPAQUE_UPPERCASE_MAIL_PASS",
        dbpass: "OPAQUE_LOWERCASE_DB_PASS",
        clientsecret: "OPAQUE_LOWERCASE_CLIENT_SECRET",
        ACCESSTOKEN: "OPAQUE_UPPERCASE_ACCESS_TOKEN",
        credentials: "OPAQUE_CREDENTIAL_BLOB",
        credentialsById: {primary: "OPAQUE_CREDENTIAL_BY_ID"},
        consumerKey: "OPAQUE_OAUTH_CONSUMER_KEY",
        keyStore: "OPAQUE_PKCS12_BASE64",
        oauthCredentials: "OPAQUE_OAUTH_CREDENTIALS",
        passwordHash: "OPAQUE_PASSWORD_HASH",
        passwordString: "OPAQUE_PASSWORD_STRING",
        privateKeyString: "OPAQUE_PRIVATE_KEY_STRING",
        secretKey: "OPAQUE_OBJECT_SECRET_KEY",
        secrets: "OPAQUE_SECRETS_BLOB",
        sessionId: "OPAQUE_SESSION_ID",
        tlsKey: "OPAQUE_TLS_PRIVATE_KEY",
        tokens: "OPAQUE_TOKENS_BLOB",
        webhookUrl: "https://hooks.slack.com/services/T123/B456/OPAQUE_WEBHOOK_SECRET",
        "https://example.com/cb#code=OPAQUE_OBJECT_KEY_CODE": {kind: "callback"},
      },
      environmentText: "OPENAI_API_KEY=OPAQUE_PREFIXED_API_KEY\nDB_PASSWORD=OPAQUE_PREFIXED_DB_PASSWORD",
      jsonSchema: {
        $defs: {
          data: {type: "string"},
        },
        definitions: {
          records: {type: "object"},
        },
        dependentSchemas: {
          data: {type: "string"},
        },
        patternProperties: {
          data: {type: "string"},
        },
        type: "array",
        items: {
          type: "object",
          required: ["region"],
          dependentRequired: {
            credit_card: ["billing_address"],
          },
          properties: {
            author: {type: "string"},
            data: {type: "string"},
            privateKeyboard: {type: "string"},
            region: {type: "string"},
            revenue: {type: "number"},
            secretary: {type: "string"},
            tokenizer: {type: "string"},
          },
        },
      },
      packageSettings: "_auth=OPAQUE_NPM_AUTH_VALUE",
      quotedCommandSettings: "--password \"OPAQUE_QUOTED_COMMAND_PASSWORD\"",
      queryDataById: {row_3: {customer: "SECRET_QUERY_DATA_BY_ID_VALUE"}},
      recordDataByKey: {row_4: {customer: "SECRET_RECORD_DATA_BY_KEY_VALUE"}},
      recordMetadataByKey: {row_6: {customer: "SECRET_RECORD_METADATA_BY_KEY_VALUE"}},
      registrySettings: "{\"auths\":{\"registry.example\":{\"auth\":\"OPAQUE_DOCKER_AUTH_VALUE\"}}}",
      recordMetadata: [{name: "SECRET_NESTED_RECORD_METADATA"}],
      rowMetadataCollection: [{customer: "SECRET_ROW_METADATA_COLLECTION_VALUE"}],
      rowMap: {row_1: {customer: "SECRET_ROW_MAP_VALUE"}},
      rowDataById: {row_5: {customer: "SECRET_ROW_DATA_BY_ID_VALUE"}},
      rowMetadataById: {row_7: {customer: "SECRET_ROW_METADATA_BY_ID_VALUE"}},
      rowsById: {row_2: {customer: "SECRET_ROWS_BY_ID_VALUE"}},
      nestedSettings: JSON.stringify(JSON.stringify({password: "OPAQUE_NESTED_JSON_PASSWORD"})),
      netrcSettings: "machine registry.example login build password OPAQUE_NETRC_PASSWORD",
      oracleDsn: "jdbc:oracle:thin:demo/OPAQUE_ORACLE_DSN_PASSWORD@db.example:1521/service",
      serializedSettings: "{&quot;password&quot;:&quot;OPAQUE_HTML_ENTITY_PASSWORD&quot;}",
      serializedHeaderDescriptor: "{\"headerName\":\"Authorization\",\"headerValue\":\"OPAQUE_SERIALIZED_HEADER_VALUE\"}",
      smtpSettings: "name: DB_PASSWORD\nvalue: OPAQUE_YAML_PASSWORD",
      serviceSettings: "{\"authenticationToken\":\"OPAQUE_CAMEL_JSON_TOKEN\"}",
      subclassedSettings: new (class extends String {})("token=OPAQUE_STRING_SUBCLASS_TOKEN"),
      unicodeEscapedSettings: "{\\u0022\\u0070assword\\u0022\\u003a\\u0022OPAQUE_UNICODE_ESCAPED_PASSWORD\\u0022}",
    },
    cryptoMeta: {
      backupJwk: {
        kty: "oct",
        k: "OPAQUE_SYMMETRIC_JWK_KEY",
      },
      binaryView: new Uint8Array(Buffer.from("OPAQUE_BINARY_VIEW_SECRET")),
      cellMetadata: [{rowIndex: 0, value: "SECRET_CELL_METADATA_VALUE"}],
      cellMetadataByIndex: {0: {customer: "SECRET_CELL_METADATA_BY_INDEX_VALUE"}},
      clusterConfig: {
        server: "https://cluster.example.com",
        "client-key-data": "OPAQUE_KUBECONFIG_CLIENT_KEY_DATA",
        clientKeyData: "OPAQUE_CAMEL_KUBECONFIG_CLIENT_KEY_DATA",
      },
      compositionSchema: {
        anyOf: [
          false,
          {type: "string"},
        ],
        oneOf: [
          {type: "object", properties: {region: {type: "string"}}},
          {type: "string"},
        ],
      },
      curlCommand: "curl -u demo:OPAQUE_CURL_PASSWORD https://example.com",
      curlProxyCommand: "curl --proxy-user demo:OPAQUE_CURL_PROXY_PASSWORD https://example.com",
      curlProxyShortCommand: "curl -U demo:OPAQUE_CURL_PROXY_SHORT_PASSWORD https://example.com",
      connectionOptions: {
        user: "demo",
        pass: "OPAQUE_OBJECT_PASS_VALUE",
      },
      currentDescriptor: {
        name: "password",
        "current-value": "OPAQUE_CURRENT_VALUE_DESCRIPTOR",
      },
      mapsEndpoint: "https://maps.googleapis.com/maps/api/geocode/json?key=OPAQUE_MAPS_API_KEY",
      itemsById: {item_1: {customer: "SECRET_ITEMS_BY_ID_VALUE"}},
      queryResultCache: {row_0: {customer: "SECRET_QUERY_CACHE_VALUE"}},
      queryResultMap: {row_2: {customer: "SECRET_QUERY_RESULT_MAP_VALUE"}},
      queryResultsByUuid: {row_1: {customer: "SECRET_QUERY_RESULTS_BY_UUID_VALUE"}},
      queryValuesById: {row_3: {customer: "SECRET_QUERY_VALUES_BY_ID_VALUE"}},
      rowsByUuid: {row_1: {customer: "SECRET_ROWS_BY_UUID_VALUE"}},
      rowsByIndex: {0: {customer: "SECRET_ROWS_BY_INDEX_VALUE"}},
      defaultDescriptor: {
        name: "password",
        default_value: "OPAQUE_DEFAULT_VALUE_DESCRIPTOR",
      },
      rawDescriptor: {
        name: "password",
        "raw.value": "OPAQUE_RAW_VALUE_DESCRIPTOR",
      },
      signingJwk: {
        kty: "RSA",
        n: "PUBLIC_MODULUS",
        e: "AQAB",
        d: "OPAQUE_PRIVATE_JWK_EXPONENT",
        p: "OPAQUE_PRIVATE_JWK_PRIME",
        q: "OPAQUE_PRIVATE_JWK_SECOND_PRIME",
      },
      serializedPrivate: "{\"kty\":\"RSA\",\"d\":\"OPAQUE_SERIALIZED_JWK_EXPONENT\"}",
      serializedPublic: "{\"kty\":\"RSA\",\"n\":\"PUBLIC_SERIALIZED_MODULUS\",\"e\":\"AQAB\"}",
      serializedSymmetric: "{\"kty\":\"oct\",\"k\":\"OPAQUE_SERIALIZED_JWK_KEY\"}",
      serializedKubeConfig: "{\"client-key-data\":\"OPAQUE_SERIALIZED_KUBECONFIG_CLIENT_KEY_DATA\"}",
      verificationJwk: {
        kty: "RSA",
        n: "PUBLIC_VERIFICATION_MODULUS",
        e: "AQAB",
      },
    },
    dateMeta: {
      fallbackDate,
      primaryDate,
    },
    downloadMeta: {
      azureUrl: "https://example.com/blob?sv=2024-11-04&sig=OPAQUE_AZURE_SAS_SIGNATURE",
      awsUrl: "https://example.com/object?X-Amz-Credential=OPAQUE_AWS_CREDENTIAL&X-Amz-Signature=OPAQUE_AWS_SIGNATURE",
      encodedUrl: "https%3A%2F%2Fexample.com%2Fobject%3FX-Amz-Signature%3DOPAQUE_ENCODED_AWS_SIGNATURE",
      encodedEndpointText: "https%3A%2F%2Fexample.com%2Fapi%3Ftoken%3DOPAQUE_ENCODED_GENERIC_TOKEN",
      encodedParameterName: "https://example.com/cb?access%5Ftoken=OPAQUE_ENCODED_PARAMETER_NAME_TOKEN",
      encodedUserinfo: "redis%3A%2F%2F%3AOPAQUE_ENCODED_URL_PASSWORD%40example.com%2F0",
      doubleEncodedUserinfo: "redis%253A%252F%252F%253AOPAQUE_DOUBLE_ENCODED_URL_PASSWORD%2540example.com%252F0",
      endpointText: "https://example.com/cb#code=OPAQUE_AUTHORIZATION_CODE",
      javaHeaderText: "JSESSIONID=OPAQUE_JAVA_SESSION_ID",
      phpHeaderText: "PHPSESSID=OPAQUE_PHP_SESSION_ID",
      aspHeaderText: "ASP.NET_SessionId=OPAQUE_ASP_SESSION_ID",
      connectHeaderText: "connect.sid=OPAQUE_CONNECT_SESSION_ID",
      compactText: "eyJhbGciOiJIUzI1NiJ9.e30.OPAQUE_SHORT_JWT_SIGNATURE",
      longColonlessUserinfo: `https://${"t".repeat(600)}OPAQUE_LONG_TOKEN_ONLY_USERINFO@example.com/path`,
      longSchemeLessDsn: `demo:${"p".repeat(600)}OPAQUE_LONG_DSN_PASSWORD@tcp(db:3306)/app`,
      longUserinfo: `${"x".repeat(475)}https://u:SECRET1234${"p".repeat(100)}@example.com/object`,
      repositoryEndpoint: "https://ghp_OPAQUE_TOKEN_ONLY_USERINFO@github.com/org/repo.git",
      serviceEndpoint: "https://example.com/api?authToken=OPAQUE_CAMEL_QUERY_TOKEN",
      serializedDescriptor: "{name:\"password\",value:\"OPAQUE_SERIALIZED_DESCRIPTOR_PASSWORD\"}",
      serializedDescriptorsText: "[{\"name\":\"region\",\"value\":\"west\"},{\"name\":\"password\",\"value\":\"OPAQUE_LATER_DESCRIPTOR_PASSWORD\"}]",
      serializedHeaderTuple: "[\"Authorization\",\"OPAQUE_SERIALIZED_TUPLE_TOKEN\"]",
      serializedReversedDescriptor: "{\"value\":\"OPAQUE_REVERSED_DESCRIPTOR_PASSWORD\",\"name\":\"password\"}",
      xmlDescriptor: "<property><name><![CDATA[password]]></name><value>OPAQUE_XML_DESCRIPTOR_PASSWORD</value></property>",
      xmlAttribute: "<connection password=\"OPAQUE_XML_ATTRIBUTE_PASSWORD\"/>",
      xmlCamelDescriptor: "<property name=\"dbPassword\" value=\"OPAQUE_XML_CAMEL_DESCRIPTOR_PASSWORD\"/>",
      xmlCamelElement: "<tlsKey>OPAQUE_XML_TLS_KEY</tlsKey>",
      xmlKeyElement: "<consumerKey><![CDATA[OPAQUE_XML_CONSUMER_KEY]]></consumerKey>",
      xmlReversedDescriptor: "<property value=\"OPAQUE_XML_REVERSED_DESCRIPTOR_PASSWORD\" name=\"password\"/>",
      xmlTruncatedDescriptor: `<property><value>OPAQUE_TRUNCATED_XML_PASSWORD${"x".repeat(600)}</value><name>password</name></property>`,
      xmlText: "<privateKeyData>OPAQUE_XML_PRIVATE_KEY_DATA</privateKeyData>",
    },
    fieldMeta,
    hugeMeta,
    qinfo: {
      headers: [
        {name: "failure_rate", type: "double"},
        {name: "Authorization", value: "SECRET_DESCRIPTOR_AUTH"},
        {key: "sessionToken", value: "SECRET_DESCRIPTOR_TOKEN"},
        ["Authorization", "SECRET_TUPLE_AUTH"],
        ["name", "sessionToken", "value", "SECRET_TUPLE_TOKEN"],
      ],
      headerLines: [
        "Authorization: Bearer SECRET_RAW_ARRAY_AUTH",
        "Cookie: YHBISESSIONID=SECRET_RAW_ARRAY_COOKIE",
        "Content-Type: application/json",
      ],
      rawHeaders: [
        "X-Api-Key",
        "OPAQUE_FLAT_HEADER_SECRET",
        "Accept",
        "application/json",
      ],
      subscriptionHeaders: [
        "Ocp-Apim-Subscription-Key",
        "OPAQUE_SUBSCRIPTION_KEY",
      ],
      jwt: "SECRET_JWT_KEY",
      pwd: "OPAQUE_PWD_VALUE",
      passwd: "OPAQUE_PASSWD_VALUE",
      passphrase: "OPAQUE_PASSPHRASE_VALUE",
      note: "eyJhbGciOiJIUzI1NiJ9.eyJzZWNyZXQiOiJTRUNSRVRfUkFXX0pXVCJ9.signature123",
      connection: "UID=user;PWD=OPAQUE_CONNECTION_SECRET",
      recordList: [{name: "SECRET_NESTED_RECORD_LIST"}],
      recordItems: [{name: "SECRET_NESTED_RECORD_ITEMS"}],
      resultSet: [{name: "SECRET_NESTED_RESULT_SET"}],
      recordSet: [{name: "SECRET_NESTED_RECORD_SET"}],
      queryResponse: [{name: "SECRET_NESTED_QUERY_RESPONSE"}],
      queryOutput: [{name: "SECRET_NESTED_QUERY_OUTPUT"}],
      entries: [{name: "SECRET_NESTED_ENTRIES"}],
      dataSet: [null, null, null, {region: "SECRET_NESTED_DATASET"}],
      fieldDataset: [{region: "SECRET_NESTED_FIELD_DATASET"}],
      bundle: [null, null, null, "SECRET_NESTED_BUNDLE", 42],
      numericPrecision: 10n ** 10000n,
      marker: Symbol("SECRET_SYMBOL_DESCRIPTION"),
      endpoint: "https://alice:OPAQUE_URL_CREDENTIAL@example.com/path",
      serializedConfig: "{\"password\":\"OPAQUE_JSON_PASSWORD\"}",
      storageConnection: "DefaultEndpointsProtocol=https;AccountName=demo;AccountKey=OPAQUE_ACCOUNT_KEY",
      cloudConfig: "AWS_SECRET_ACCESS_KEY=OPAQUE_AWS_SECRET",
      shortScheme: "Basic dTpw",
      encodedText: `eyJhbGciOiJIUzI1NiJ9.${"a".repeat(600)}.signature123`,
      redisEndpoint: "redis://:OPAQUE_REDIS_PASSWORD@example.com/0",
      tls: {
        pem: "-----BEGIN OPENSSH PRIVATE KEY-----\nSECRET_PEM_BODY",
        encryptedPem: "-----BEGIN ENCRYPTED PRIVATE KEY-----\nSECRET_ENCRYPTED_PEM_BODY",
        dsaPem: "-----BEGIN DSA PRIVATE KEY-----\nSECRET_DSA_PEM_BODY",
      },
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
    queryResponse: [{name: "SECRET_QUERY_RESPONSE"}],
    queryEntries: [{name: "SECRET_QUERY_ENTRIES"}],
    queryDataset: [null, null, null, {region: "SECRET_QUERY_DATASET"}],
    queryFieldDataset: [{region: "SECRET_QUERY_FIELD_DATASET"}],
    queryBundle: [null, null, null, "SECRET_QUERY_BUNDLE", 42],
    metadataRows: [{name: "SECRET_METADATA_ROW"}],
    rowMetadata: [{name: "SECRET_ROW_METADATA"}],
    headers: "Authorization: Bearer SECRET_RAW_HEADER",
    prototypeMeta,
    schemaMeta,
    renderHelper() {},
    chartElement: {nodeType: 1, nodeName: "DIV"},
  });
  const inheritedRuntimePrototype = {};
  for (let index = 0; index < 2100; index += 1) {
    inheritedRuntimePrototype[`inherited_option_${index}`] = "SECRET_INHERITED_OPTION";
  }
  Object.setPrototypeOf(runtimeOptions, inheritedRuntimePrototype);
  global.options = runtimeOptions;

  require(path.resolve(__dirname, "../component/yonghong_ai_component.js"));
  assert.strictEqual(renderResetCount, 1, "legacy UI should be rebuilt for the metadata action");
  await elements['[data-action="copyMetadata"]'].onclick();

  assert.ok(clipboardText, "diagnostic should be copied");
  const diagnostic = JSON.parse(clipboardText);
  const collisionOutputKey = `${collisionKeyA.slice(0, 120)}...[键已截断]`;

  assert.deepStrictEqual(
    diagnostic.metadataCandidateKeys,
    [
      "aggregateFunctions",
      "aggregations",
      "authorFieldMetadata",
      "configMeta",
      "cryptoMeta",
      "dateMeta",
      "downloadMeta",
      "fieldList",
      "fieldMeta",
      "formulaExpressions",
      collisionOutputKey,
      `${collisionOutputKey}#2`,
      "headers",
      "hugeMeta",
      "prototypeMeta",
      "qinfo",
      "roles",
      "schemaMeta",
    ],
  );
  assert.deepStrictEqual(
    diagnostic.omittedRowCandidateKeys,
    [
      "metadataRows",
      "queryBundle",
      "queryData",
      "queryDataset",
      "queryEntries",
      "queryFieldDataset",
      "queryList",
      "queryResponse",
      "queryResultSet",
      "rowMetadata",
    ],
  );
  assert.ok(!diagnostic.optionsKeys.includes("fieldMeta"));
  assert.strictEqual(diagnostic.optionKeyScan.displayTruncated, true);
  assert.strictEqual(diagnostic.optionKeyScan.scanTruncated, true);
  assert.strictEqual(diagnostic.boundSources[0], "column1");
  assert.match(diagnostic.boundSources[1], /\[键已截断\]$/);
  assert.ok(diagnostic.boundSources[1].length < 200);
  assert.strictEqual(diagnostic.limits.maxKeyChars, 120);
  assert.deepStrictEqual(diagnostic.metadata.aggregateFunctions, ["SUM", "AVG"]);
  assert.deepStrictEqual(diagnostic.metadata.aggregations, [{name: "SUM"}]);
  assert.strictEqual(diagnostic.metadata.authorFieldMetadata.fields[0].name, "author");
  assert.deepStrictEqual(diagnostic.metadata.roles, ["dimension", "measure"]);
  assert.match(diagnostic.metadata.configMeta.boxedSettings, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.configMeta.commandSettings, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.configMeta.connectionDsn, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.configMeta.connectionSettings, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.configMeta.cryptographySettings, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.configMeta.databaseSettings, /已省略可能包含凭证的字符串/);
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "smtpPass"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "apiKeys"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "apiKeysByTenant"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "accessTokens"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "accessTokensByUser"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "accessTokenString"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "authorizationCode"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "YHBISESSIONID"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "DBPASS"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "MAILPASS"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "dbpass"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "clientsecret"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "ACCESSTOKEN"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "credentials"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "credentialsById"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "consumerKey"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "keyStore"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "oauthCredentials"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "passwordHash"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "passwordString"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "privateKeyString"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "secretKey"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "secrets"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "sessionId"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "tlsKey"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "tokens"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.configMeta.mailSettings, "webhookUrl"));
  assert.ok(!Object.keys(diagnostic.metadata.configMeta.mailSettings).some((key) => key.includes("OPAQUE_OBJECT_KEY_CODE")));
  assert.match(diagnostic.metadata.configMeta.environmentText, /已省略可能包含凭证的字符串/);
  assert.strictEqual(diagnostic.metadata.configMeta.jsonSchema.items.type, "object");
  assert.strictEqual(diagnostic.metadata.configMeta.jsonSchema.$defs.data.type, "string");
  assert.strictEqual(diagnostic.metadata.configMeta.jsonSchema.definitions.records.type, "object");
  assert.strictEqual(diagnostic.metadata.configMeta.jsonSchema.dependentSchemas.data.type, "string");
  assert.strictEqual(diagnostic.metadata.configMeta.jsonSchema.patternProperties.data.type, "string");
  assert.deepStrictEqual(diagnostic.metadata.configMeta.jsonSchema.items.required, ["region"]);
  assert.deepStrictEqual(
    diagnostic.metadata.configMeta.jsonSchema.items.dependentRequired.credit_card,
    ["billing_address"],
  );
  assert.match(diagnostic.metadata.configMeta.jsonSchema.items.properties.author, /对象层级已截断/);
  assert.match(diagnostic.metadata.configMeta.jsonSchema.items.properties.data, /对象层级已截断/);
  assert.match(diagnostic.metadata.configMeta.jsonSchema.items.properties.privateKeyboard, /对象层级已截断/);
  assert.match(diagnostic.metadata.configMeta.jsonSchema.items.properties.region, /对象层级已截断/);
  assert.match(diagnostic.metadata.configMeta.jsonSchema.items.properties.revenue, /对象层级已截断/);
  assert.match(diagnostic.metadata.configMeta.jsonSchema.items.properties.secretary, /对象层级已截断/);
  assert.match(diagnostic.metadata.configMeta.jsonSchema.items.properties.tokenizer, /对象层级已截断/);
  assert.match(diagnostic.metadata.configMeta.packageSettings, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.configMeta.quotedCommandSettings, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.configMeta.queryDataById, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.configMeta.recordDataByKey, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.configMeta.recordMetadataByKey, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.configMeta.registrySettings, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.configMeta.recordMetadata, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.configMeta.rowMetadataCollection, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.configMeta.rowMap, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.configMeta.rowDataById, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.configMeta.rowMetadataById, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.configMeta.rowsById, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.configMeta.nestedSettings, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.configMeta.netrcSettings, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.configMeta.oracleDsn, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.configMeta.serializedSettings, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.configMeta.serializedHeaderDescriptor, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.configMeta.smtpSettings, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.configMeta.serviceSettings, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.configMeta.subclassedSettings, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.configMeta.unicodeEscapedSettings, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.cryptoMeta.backupJwk, /已省略私有 JWK/);
  assert.match(diagnostic.metadata.cryptoMeta.binaryView, /已省略二进制视图/);
  assert.match(diagnostic.metadata.cryptoMeta.cellMetadata, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.cryptoMeta.cellMetadataByIndex, /已省略潜在行数据/);
  assert.strictEqual(diagnostic.metadata.cryptoMeta.clusterConfig.server, "https://cluster.example.com");
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.cryptoMeta.clusterConfig, "client-key-data"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.cryptoMeta.clusterConfig, "clientKeyData"));
  assert.strictEqual(diagnostic.metadata.cryptoMeta.compositionSchema.anyOf[0], false);
  assert.strictEqual(diagnostic.metadata.cryptoMeta.compositionSchema.anyOf[1].type, "string");
  assert.strictEqual(diagnostic.metadata.cryptoMeta.compositionSchema.oneOf[0].type, "object");
  assert.strictEqual(diagnostic.metadata.cryptoMeta.compositionSchema.oneOf[1].type, "string");
  assert.strictEqual(diagnostic.metadata.cryptoMeta.connectionOptions.user, "demo");
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.cryptoMeta.connectionOptions, "pass"));
  assert.match(diagnostic.metadata.cryptoMeta.currentDescriptor, /已省略敏感名称\/值描述符/);
  assert.match(diagnostic.metadata.cryptoMeta.curlCommand, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.cryptoMeta.curlProxyCommand, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.cryptoMeta.curlProxyShortCommand, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.cryptoMeta.mapsEndpoint, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.cryptoMeta.itemsById, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.cryptoMeta.queryResultCache, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.cryptoMeta.queryResultMap, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.cryptoMeta.queryResultsByUuid, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.cryptoMeta.queryValuesById, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.cryptoMeta.rowsByUuid, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.cryptoMeta.rowsByIndex, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.cryptoMeta.defaultDescriptor, /已省略敏感名称\/值描述符/);
  assert.match(diagnostic.metadata.cryptoMeta.rawDescriptor, /已省略敏感名称\/值描述符/);
  assert.match(diagnostic.metadata.cryptoMeta.signingJwk, /已省略私有 JWK/);
  assert.match(diagnostic.metadata.cryptoMeta.serializedPrivate, /已省略可能包含凭证的字符串/);
  assert.strictEqual(
    diagnostic.metadata.cryptoMeta.serializedPublic,
    "{\"kty\":\"RSA\",\"n\":\"PUBLIC_SERIALIZED_MODULUS\",\"e\":\"AQAB\"}",
  );
  assert.match(diagnostic.metadata.cryptoMeta.serializedSymmetric, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.cryptoMeta.serializedKubeConfig, /已省略可能包含凭证的字符串/);
  assert.strictEqual(diagnostic.metadata.cryptoMeta.verificationJwk.kty, "RSA");
  assert.strictEqual(diagnostic.metadata.cryptoMeta.verificationJwk.n, "PUBLIC_VERIFICATION_MODULUS");
  assert.match(diagnostic.metadata.dateMeta.primaryDate, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.dateMeta.fallbackDate, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.azureUrl, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.awsUrl, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.encodedUrl, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.encodedEndpointText, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.encodedParameterName, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.encodedUserinfo, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.doubleEncodedUserinfo, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.endpointText, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.javaHeaderText, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.phpHeaderText, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.aspHeaderText, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.connectHeaderText, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.compactText, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.longColonlessUserinfo, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.longSchemeLessDsn, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.longUserinfo, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.repositoryEndpoint, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.serviceEndpoint, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.serializedDescriptor, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.serializedDescriptorsText, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.serializedHeaderTuple, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.serializedReversedDescriptor, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.xmlAttribute, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.xmlCamelDescriptor, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.xmlCamelElement, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.xmlKeyElement, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.xmlDescriptor, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.xmlReversedDescriptor, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.xmlTruncatedDescriptor, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.downloadMeta.xmlText, /已省略可能包含凭证的字符串/);
  assert.deepStrictEqual(diagnostic.metadata.fieldMeta.arrayTypeSchema.required, ["id"]);
  assert.strictEqual(diagnostic.metadata[collisionOutputKey].expression, "FIRST_COLLISION_FORMULA");
  assert.strictEqual(diagnostic.metadata[`${collisionOutputKey}#2`].expression, "SECOND_COLLISION_FORMULA");
  assert.deepStrictEqual(
    diagnostic.metadata.formulaExpressions,
    ["failure_count / total_count", "revenue - cost"],
  );
  assert.strictEqual(diagnostic.metadata.fieldMeta.fields[0].name, "failure_rate");
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.fieldMeta, "cookieHeader"));
  assert.match(diagnostic.metadata.fieldMeta.dimensionMembers, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.fieldMeta.dimensionMembersById, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.fieldMeta.dimensionValuesById, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.fieldMeta.hierarchyNodesById, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.fieldMeta.memberCache, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.fieldMeta.memberMap, /已省略潜在行数据/);
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.fieldMeta, "sessionCookie"));
  assert.deepStrictEqual(diagnostic.metadata.fieldMeta.signatureHeaders, {});
  assert.strictEqual(diagnostic.metadata.fieldMeta.fields[0].formula, "failure_count / total_count");
  assert.deepStrictEqual(diagnostic.metadata.fieldMeta.choiceDefinitions, [{label: "Enabled", value: "enabled"}]);
  assert.deepStrictEqual(diagnostic.metadata.fieldList, [
    {name: "region", role: "dimension"},
    {name: "revenue", role: "measure"},
  ]);
  assert.match(diagnostic.metadata.fieldMeta.headerDescriptor, /已省略敏感名称\/值描述符/);
  assert.strictEqual(diagnostic.metadata.fieldMeta.self, "[循环引用]");
  assert.strictEqual(diagnostic.metadata.fieldMeta.choices.length, 6);
  assert.match(diagnostic.metadata.fieldMeta.choices[5], /其余 1 项已省略/);
  assert.match(diagnostic.metadata.fieldMeta.longLabel, /已截断/);
  assert.match(diagnostic.metadata.fieldMeta.rows, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.fieldMeta.fields[1], /已省略敏感名称\/值描述符/);
  assert.match(diagnostic.metadata.fieldMeta.fields[2], /已省略敏感名称\/值描述符/);
  assert.match(diagnostic.metadata.fieldMeta.fields[3], /已省略敏感名称\/值描述符/);
  assert.match(diagnostic.metadata.fieldMeta.fields[4], /已省略敏感名称\/值描述符/);
  assert.match(diagnostic.metadata.qinfo.samples, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.queryData, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.metadataRows, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.fieldData, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.headers[1], /已省略敏感名称\/值描述符/);
  assert.match(diagnostic.metadata.qinfo.headers[2], /已省略敏感名称\/值描述符/);
  assert.match(diagnostic.metadata.qinfo.headers[3], /已省略敏感名称\/值元组/);
  assert.match(diagnostic.metadata.qinfo.headers[4], /已省略敏感名称\/值元组/);
  assert.match(diagnostic.metadata.qinfo.headerLines, /已省略敏感名称\/值元组/);
  assert.match(diagnostic.metadata.qinfo.rawHeaders, /已省略敏感名称\/值元组/);
  assert.match(diagnostic.metadata.qinfo.subscriptionHeaders, /已省略敏感名称\/值元组/);
  assert.match(diagnostic.metadata.qinfo.note, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.qinfo.connection, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.qinfo.recordList, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.recordItems, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.resultSet, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.recordSet, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.queryResponse, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.queryOutput, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.entries, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.dataSet, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.fieldDataset, /已省略潜在行数据/);
  assert.match(diagnostic.metadata.qinfo.bundle, /已省略潜在行数据/);
  assert.strictEqual(diagnostic.metadata.qinfo.numericPrecision, "[已省略 BigInt]");
  assert.strictEqual(diagnostic.metadata.qinfo.marker, "[已省略 Symbol]");
  assert.match(diagnostic.metadata.qinfo.endpoint, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.qinfo.serializedConfig, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.qinfo.storageConnection, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.qinfo.cloudConfig, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.qinfo.shortScheme, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.qinfo.encodedText, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.qinfo.redisEndpoint, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.qinfo.tls.pem, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.qinfo.tls.encryptedPem, /已省略可能包含凭证的字符串/);
  assert.match(diagnostic.metadata.qinfo.tls.dsaPem, /已省略可能包含凭证的字符串/);
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.qinfo, "jwt"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.qinfo, "pwd"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.qinfo, "passwd"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.qinfo, "passphrase"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.qinfo, "encryptionKey"));
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.qinfo, "signingKey"));
  assert.match(diagnostic.metadata.headers, /已省略可能包含凭证的字符串/);
  assert.ok(!Object.prototype.hasOwnProperty.call(diagnostic.metadata.qinfo, "cookie"));
  assert.strictEqual(diagnostic.metadata.hugeMeta.__truncatedKeys, true);
  assert.strictEqual(diagnostic.metadata.prototypeMeta.__truncatedKeys, true);
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
    "OPAQUE_DOTNET_DESCRIPTOR",
    "OPAQUE_PWD_VALUE",
    "OPAQUE_PASSWD_VALUE",
    "OPAQUE_PASSPHRASE_VALUE",
    "OPAQUE_CONNECTION_SECRET",
    "SECRET_QUERY_LIST",
    "SECRET_NESTED_RECORD_LIST",
    "SECRET_NESTED_RECORD_ITEMS",
    "SECRET_NESTED_RESULT_SET",
    "SECRET_NESTED_RECORD_SET",
    "SECRET_QUERY_RESULT_SET",
    "SECRET_NESTED_QUERY_RESPONSE",
    "SECRET_NESTED_QUERY_OUTPUT",
    "SECRET_QUERY_RESPONSE",
    "SECRET_SYMBOL_DESCRIPTION",
    "OPAQUE_URL_CREDENTIAL",
    "SECRET_PEM_BODY",
    "SECRET_ENCRYPTED_PEM_BODY",
    "SECRET_DSA_PEM_BODY",
    "OPAQUE_FLAT_HEADER_SECRET",
    "OPAQUE_JSON_PASSWORD",
    "SECRET_NESTED_ENTRIES",
    "SECRET_QUERY_ENTRIES",
    "SECRET_NESTED_DATASET",
    "SECRET_QUERY_DATASET",
    "SECRET_NESTED_FIELD_DATASET",
    "SECRET_QUERY_FIELD_DATASET",
    "SECRET_NESTED_BUNDLE",
    "SECRET_QUERY_BUNDLE",
    "SECRET_INHERITED_META_",
    "SECRET_INHERITED_OPTION",
    "OPAQUE_ACCOUNT_KEY",
    "OPAQUE_AWS_SECRET",
    "OPAQUE_SUBSCRIPTION_KEY",
    "Basic dTpw",
    "OPAQUE_TRUNCATED_DESCRIPTOR",
    "OPAQUE_REDIS_PASSWORD",
    "OPAQUE_DATE_ISO_TOKEN",
    "OPAQUE_DATE_FALLBACK_PASSWORD",
    "OPAQUE_AZURE_SAS_SIGNATURE",
    "OPAQUE_AWS_CREDENTIAL",
    "OPAQUE_AWS_SIGNATURE",
    "OPAQUE_ENCODED_AWS_SIGNATURE",
    "OPAQUE_ENCODED_GENERIC_TOKEN",
    "OPAQUE_ENCODED_URL_PASSWORD",
    "OPAQUE_DOUBLE_ENCODED_URL_PASSWORD",
    "OPAQUE_GENERIC_QUERY_TOKEN",
    "OPAQUE_GENERIC_JSON_TOKEN",
    "OPAQUE_CAMEL_QUERY_TOKEN",
    "OPAQUE_CAMEL_JSON_TOKEN",
    "OPAQUE_PREFIXED_API_KEY",
    "OPAQUE_PREFIXED_DB_PASSWORD",
    "OPAQUE_XML_DESCRIPTOR_PASSWORD",
    "OPAQUE_XML_PASSWORD",
    "OPAQUE_XML_ATTRIBUTE_PASSWORD",
    "OPAQUE_XML_CAMEL_DESCRIPTOR_PASSWORD",
    "OPAQUE_XML_CAMEL_PASSWORD",
    "OPAQUE_CAMEL_DB_PASSWORD",
    "OPAQUE_CAMEL_DATABASE_PASSWORD",
    "OPAQUE_SERIALIZED_DESCRIPTOR_PASSWORD",
    "OPAQUE_REVERSED_DESCRIPTOR_PASSWORD",
    "OPAQUE_XML_REVERSED_DESCRIPTOR_PASSWORD",
    "OPAQUE_SECRET_KEY_VALUE",
    "OPAQUE_PRIVATE_KEY_VALUE",
    "OPAQUE_LATER_DESCRIPTOR_PASSWORD",
    "OPAQUE_XML_PRIVATE_KEY",
    "OPAQUE_JAVA_SESSION_ID",
    "OPAQUE_PHP_SESSION_ID",
    "OPAQUE_ASP_SESSION_ID",
    "OPAQUE_CONNECT_SESSION_ID",
    "OPAQUE_NPM_AUTH_VALUE",
    "OPAQUE_DOCKER_AUTH_VALUE",
    "OPAQUE_NESTED_JSON_PASSWORD",
    "OPAQUE_UNICODE_ESCAPED_PASSWORD",
    "OPAQUE_BOXED_STRING_PASSWORD",
    "OPAQUE_STRING_SUBCLASS_TOKEN",
    "OPAQUE_SCHEMELESS_DSN_PASSWORD",
    "OPAQUE_HEADER_VALUE_DESCRIPTOR",
    "OPAQUE_COMMAND_PASSWORD",
    "OPAQUE_NETRC_PASSWORD",
    "OPAQUE_QUOTED_COMMAND_PASSWORD",
    "OPAQUE_TRUNCATED_XML_PASSWORD",
    "OPAQUE_SERIALIZED_TUPLE_TOKEN",
    "OPAQUE_ORACLE_DSN_PASSWORD",
    "OPAQUE_SERIALIZED_HEADER_VALUE",
    "SECRET_ROW_MAP_VALUE",
    "SECRET_ROWS_BY_ID_VALUE",
    "SECRET_QUERY_DATA_BY_ID_VALUE",
    "SECRET_RECORD_DATA_BY_KEY_VALUE",
    "SECRET_ROW_DATA_BY_ID_VALUE",
    "SECRET_RECORD_METADATA_BY_KEY_VALUE",
    "SECRET_ROW_METADATA_BY_ID_VALUE",
    "OPAQUE_CAMEL_SMTP_PASS",
    "OPAQUE_SERIALIZED_SMTP_PASS",
    "OPAQUE_BINARY_VIEW_SECRET",
    "OPAQUE_LONG_DSN_PASSWORD",
    "SECRET_CELL_METADATA_VALUE",
    "OPAQUE_MAPS_API_KEY",
    "OPAQUE_CURL_PASSWORD",
    "SECRET_ROWS_BY_INDEX_VALUE",
    "OPAQUE_OBJECT_PASS_VALUE",
    "OPAQUE_SERIALIZED_PASS_VALUE",
    "OPAQUE_CURRENT_VALUE_DESCRIPTOR",
    "OPAQUE_DEFAULT_VALUE_DESCRIPTOR",
    "OPAQUE_RAW_VALUE_DESCRIPTOR",
    "OPAQUE_SYMMETRIC_JWK_KEY",
    "OPAQUE_PRIVATE_JWK_EXPONENT",
    "OPAQUE_PRIVATE_JWK_PRIME",
    "OPAQUE_PRIVATE_JWK_SECOND_PRIME",
    "OPAQUE_SERIALIZED_JWK_EXPONENT",
    "OPAQUE_SERIALIZED_JWK_KEY",
    "OPAQUE_KUBECONFIG_CLIENT_KEY_DATA",
    "OPAQUE_CAMEL_KUBECONFIG_CLIENT_KEY_DATA",
    "OPAQUE_SERIALIZED_KUBECONFIG_CLIENT_KEY_DATA",
    "OPAQUE_SHORT_JWT_SIGNATURE",
    "OPAQUE_LONG_TOKEN_ONLY_USERINFO",
    "OPAQUE_TOKEN_ONLY_USERINFO",
    "OPAQUE_ENCRYPTION_KEY",
    "OPAQUE_SIGNING_KEY",
    "SECRET_NESTED_RECORD_METADATA",
    "SECRET_ROW_METADATA",
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
