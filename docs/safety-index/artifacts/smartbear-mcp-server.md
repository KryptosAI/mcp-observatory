# MCP Observatory Run Report

Generated at 2026-07-15T22:34:31.568Z

## Target and Environment Metadata

- Target: `smartbear-mcp-server`
- Adapter: `local-process`
- Command: `npx -y @smartbear/mcp`
- Server: `SmartBear MCP Server 0.29.0`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 76/100 (C)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 20/100 | 20% |
| Reliability | 100/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fail | 9 | 4 | 2 | 3 | 0 | 0 | 0 |

## At a Glance

- Safety verdict: **Blocked** — One or more checks can break agent dependence and should be fixed before production use.
- Top risks: attack-sim: Safe attack simulation found 11 finding(s): 0 high, 11 medium, 0 low.; runtime-profile: Detected 260 potential egress target(s) and 417 potential state mutation(s) with high confidence.; schema-quality: Found 86 quality finding(s) across 290 item(s): 0 warnings, 86 info.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: security-lite, security
- Partial or flaky checks: runtime-profile, schema-quality, attack-sim
- Skipped checks: none
- Unsupported checks: none
- Suggested next step: Start with the failing checks: security-lite, security.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### Egress Manifest

The following targets were identified as potentially reachable by this server (confidence: **high**):

| Target | Protocol | Source | Confidence |
| --- | --- | --- | --- |
| bearq_wait_for_task | unknown | description_analysis | low |
| The natural language prompt describing the test step. The prompt should describe a single action, assertion, or query. The prompt can only contain literal text; it cannot contain template variables, secrets, or other dynamic syntax. If we are in a Web recording, the prompt can perform browser navigation (e.g. 'Click on the back button', 'Navigate to https://www.example.com') and use the tab and enter keys to navigate (e.g. 'Press the tab key', 'Press the enter key'). | unknown | description_analysis | medium |
| reflect_add_prompt_step | unknown | description_analysis | low |
| bugsnag_get_current_project | unknown | description_analysis | low |
| The API key of the BugSnag project, if known. | unknown | description_analysis | medium |
| bugsnag_list_projects | unknown | description_analysis | low |
| bugsnag_get_error | unknown | description_analysis | low |
| URL for retrieving the next page of results. Use the value in the previous response to get the next page when more results are available. Only values provided in the output from this tool can be used. Do not attempt to construct it manually. | unknown | description_analysis | medium |
| bugsnag_list_project_errors | unknown | description_analysis | low |
| The URL of the issue to link to the error - required when operation is 'link_issue' | unknown | description_analysis | medium |
| bugsnag_update_error | unknown | description_analysis | low |
| Full URL to the event details page in the BugSnag dashboard (web interface), containing project slug and event_id parameter. | unknown | description_analysis | medium |
| bugsnag_get_event_details_from_dashboard_url | unknown | description_analysis | low |
| URL for retrieving the next page of results. Use the value in the previous response to get the next page when more results are available. Only values provided in the output from this tool can be used. Do not attempt to construct it manually. | unknown | description_analysis | medium |
| bugsnag_get_events_on_an_error | unknown | description_analysis | low |
| URL for retrieving the next page of results. Use the value in the previous response to get the next page when more results are available. Only values provided in the output from this tool can be used. Do not attempt to construct it manually. | unknown | description_analysis | medium |
| bugsnag_list_releases | unknown | description_analysis | low |
| URL for retrieving the next page of results. Use the value in the previous response to get the next page when more results are available. Only values provided in the output from this tool can be used. Do not attempt to construct it manually. | unknown | description_analysis | medium |
| bugsnag_list_span_groups | unknown | description_analysis | low |
| bugsnag_get_span_group | unknown | description_analysis | low |
| URL for retrieving the next page of results. Use the value in the previous response to get the next page when more results are available. Only values provided in the output from this tool can be used. Do not attempt to construct it manually. | unknown | description_analysis | medium |
| bugsnag_list_spans | unknown | description_analysis | low |
| URL for retrieving the next page of results. Use the value in the previous response to get the next page when more results are available. Only values provided in the output from this tool can be used. Do not attempt to construct it manually. | unknown | description_analysis | medium |
| bugsnag_get_trace | unknown | description_analysis | low |
| bugsnag_get_network_endpoint_groupings | unknown | description_analysis | low |
| Array of URL patterns by which network spans are grouped. Endpoints follow OpenAPI path templating syntax (https://swagger.io/specification/#path-templating) where path parameters use curly braces (e.g., /users/{id}). If you encounter colon-prefixed parameters (e.g., :userId from Express/React Router), convert them to curly braces (e.g., {userId}). Wildcards (*) can be used in domains (e.g., https://*.example.com) to match multiple subdomains. | unknown | description_analysis | medium |
| bugsnag_set_network_endpoint_groupings | unknown | description_analysis | low |
| The portal subdomain - used in the portal URL (e.g., 'myportal' for myportal.example.com). Must be unique, lowercase, 3-20 characters, alphanumeric with hyphens | unknown | description_analysis | medium |
| swagger_create_portal | unknown | description_analysis | low |
| Update the portal subdomain - changes the portal URL. Must remain unique across all portals (3-20 characters, lowercase, alphanumeric with hyphens) | unknown | description_analysis | medium |
| swagger_update_portal | unknown | description_analysis | low |
| URL-friendly identifier for the product - must be unique within the portal, used in URLs (e.g., 'my-api' becomes /my-api). 3-22 characters, lowercase, alphanumeric with hyphens, underscores, or dots | unknown | description_analysis | medium |
| Product description - explains what the API/product does, shown in product listings and cards (max 110 characters) | unknown | description_analysis | medium |
| swagger_create_portal_product | unknown | description_analysis | low |
| Update URL-friendly identifier - must remain unique within the portal, affects product URLs (3-22 characters, lowercase, alphanumeric with hyphens/underscores/dots) | unknown | description_analysis | medium |
| Update product description - explains the API/product functionality, shown in listings (max 110 characters) | unknown | description_analysis | medium |
| swagger_update_portal_product | unknown | description_analysis | low |
| Optional table of contents UUID, or identifier in the format 'portal-subdomain:product-slug:section-slug:table-of-contents-slug'. When provided, publishPortalProduct uses it to resolve the published URL path for the returned preview/live link. | unknown | description_analysis | medium |
| swagger_publish_portal_product | unknown | description_analysis | low |
| List of related entities to embed in the response - e.g., ['tableOfContents', 'tableOfContents.swaggerhubApi'] to include table of contents and SwaggerHub API details | unknown | description_analysis | medium |
| swagger_list_portal_product_sections | unknown | description_analysis | low |
| URL-friendly identifier for the table of contents item - must be unique within the section (3-22 characters, lowercase, alphanumeric with hyphens/underscores/dots) | unknown | description_analysis | medium |
| swagger_create_table_of_contents | unknown | description_analysis | low |
| List of related entities to embed in the response - e.g., ['swaggerhubApi'] to include SwaggerHub API details | unknown | description_analysis | medium |
| swagger_list_table_of_contents | unknown | description_analysis | low |
| URL slug for the documentation page. 3-255 characters, lowercase, alphanumeric with hyphens, underscores, or dots (e.g. 'my-page'). If not provided, the slug is generated from the page title. | unknown | description_analysis | medium |
| Content type of the documentation page. 'markdown' works with both 'internal' and 'external' source. 'html' only works with 'external' source — html + internal is not supported by the API and will return an error. | unknown | description_analysis | medium |
| Where the document content is managed. 'internal': editable in both the portal UI and via API. 'external': editable via API only, not in the portal UI. Constraint: 'html' content type only supports 'external' source. | unknown | description_analysis | medium |
| swagger_create_documentation_page | unknown | description_analysis | low |
| Content type of the document. Note: documents with type 'html' and source 'internal' cannot be edited via API — only 'html' + 'external' and all 'markdown' combinations are supported. | unknown | description_analysis | medium |
| Where the document content is managed. 'internal': editable in both portal UI and API. 'external': editable via API only. Note: 'html' + 'internal' documents cannot be updated via API. | unknown | description_analysis | medium |
| swagger_update_document | unknown | description_analysis | low |
| Filter by specification type - API or DOMAIN (default all types) | unknown | description_analysis | medium |
| swagger_search_apis_and_domains | unknown | description_analysis | low |
| API owner (organization or user, case-sensitive) | unknown | description_analysis | medium |
| API name (case-sensitive) | unknown | description_analysis | medium |
| swagger_get_api_definition | unknown | description_analysis | low |
| Organization name (owner of the API) | unknown | description_analysis | medium |
| API name | unknown | description_analysis | medium |
| API definition content (OpenAPI/AsyncAPI specification in JSON or YAML format). Format is automatically detected. API is created with fixed values: version 1.0.0, private visibility, automock disabled, and no project assignment. | unknown | description_analysis | medium |
| swagger_create_or_update_api | unknown | description_analysis | low |
| swagger_list_organizations | unknown | description_analysis | low |
| API definition content (OpenAPI/AsyncAPI specification in JSON or YAML format) to scan for standardization errors | unknown | description_analysis | medium |
| swagger_scan_api_standardization | unknown | description_analysis | low |
| The organization name that owns the API and provides the standardization rules (case-sensitive) | unknown | description_analysis | medium |
| API name (case-sensitive) | unknown | description_analysis | medium |
| swagger_scan_api_standardization_from_registry | unknown | description_analysis | low |
| API owner (organization or user, case-sensitive) | unknown | description_analysis | medium |
| API name | unknown | description_analysis | medium |
| The prompt describing the desired API functionality (e.g., 'Create a RESTful API for managing a pet store with endpoints for pets, orders, and inventory') | unknown | description_analysis | medium |
| Specification type for the generated API definition. Use: 'openapi20' for OpenAPI 2.0, 'openapi30x' for OpenAPI 3.0.x (default), 'openapi31x' for OpenAPI 3.1.x, 'asyncapi2xx' for AsyncAPI 2.x, 'asyncapi30x' for AsyncAPI 3.0.x | unknown | description_analysis | medium |
| swagger_create_api_from_prompt | unknown | description_analysis | low |
| API owner (organization or user, case-sensitive) | unknown | description_analysis | medium |
| API name (case-sensitive) | unknown | description_analysis | medium |
| swagger_standardize_api | unknown | description_analysis | low |
| Direct request/response pair for a specific interaction. Use this when you have concrete examples of API requests and responses | unknown | description_analysis | medium |
| Collection of source code files to analyze and extract API interactions from. Include client code, data models, existing tests, or any code that makes API calls | unknown | description_analysis | medium |
| If provided, the OpenAPI document which describes the API being tested and is accompanied by a matcher which will be used to identify the interactions in the OpenAPI document which are relevant to the Pact refinement process. | unknown | description_analysis | medium |
| contract-testing_generate_pact_tests | unknown | description_analysis | low |
| Collection of source code files to analyze and extract API interactions from. Include client code, data models, existing tests, or any code that makes API calls | unknown | description_analysis | medium |
| If provided, the OpenAPI document which describes the API being tested and is accompanied by a matcher which will be used to identify the interactions in the OpenAPI document which are relevant to the Pact refinement process. | unknown | description_analysis | medium |
| contract-testing_review_pact_tests | unknown | description_analysis | low |
| contract-testing_matrix | unknown | description_analysis | low |
| URL of the CI build that produced these contracts | unknown | description_analysis | medium |
| contract-testing_publish_consumer_contracts | unknown | description_analysis | low |
| URL of the CI build | unknown | description_analysis | medium |
| contract-testing_publish_provider_contract | unknown | description_analysis | low |
| URL of the source repository | unknown | description_analysis | medium |
| contract-testing_update_pacticipant | unknown | description_analysis | low |
| URL of the source repository | unknown | description_analysis | medium |
| contract-testing_patch_pacticipant | unknown | description_analysis | low |
| URL of the CI build that produced this version | unknown | description_analysis | medium |
| contract-testing_update_pacticipant_version | unknown | description_analysis | low |
| URL of the source repository | unknown | description_analysis | medium |
| contract-testing_create_pacticipant | unknown | description_analysis | low |
| UUID of the webhook | unknown | description_analysis | medium |
| contract-testing_get_webhook | unknown | description_analysis | low |
| Human-readable description of the webhook | unknown | description_analysis | medium |
| Events that trigger this webhook | unknown | description_analysis | medium |
| HTTP request to send when triggered | unknown | description_analysis | medium |
| Whether the webhook is enabled | unknown | description_analysis | medium |
| contract-testing_create_webhook | unknown | description_analysis | low |
| UUID of the webhook to update | unknown | description_analysis | medium |
| Events that trigger this webhook | unknown | description_analysis | medium |
| HTTP request to send when triggered | unknown | description_analysis | medium |
| Whether the webhook is enabled | unknown | description_analysis | medium |
| contract-testing_update_webhook | unknown | description_analysis | low |
| UUID of the webhook | unknown | description_analysis | medium |
| contract-testing_delete_webhook | unknown | description_analysis | low |
| UUID of the webhook | unknown | description_analysis | medium |
| contract-testing_execute_webhook | unknown | description_analysis | low |
| contract-testing_create_secret | unknown | description_analysis | low |
| contract-testing_list_api_tokens | unknown | description_analysis | low |
| contract-testing_regenerate_api_token | unknown | description_analysis | low |
| contract-testing_admin_get_system_account_tokens | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_qmetry_list_projects | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_builds | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_platforms | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_create_release | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_create_cycle | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_update_cycle | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_update_test_case | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_test_cases | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_test_case_details | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_test_case_version_details | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_test_case_steps | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_test_case_executions | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_requirements | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_requirement_details | unknown | description_analysis | low |
| qmetry_link_requirements_to_testcase | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_test_cases_linked_to_requirement | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_requirements_linked_to_test_case | unknown | description_analysis | low |
| qmetry_create_test_suite | unknown | description_analysis | low |
| qmetry_update_test_suite | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_test_suites | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_test_suites_for_test_case | unknown | description_analysis | low |
| qmetry_link_test_cases_to_test_suite | unknown | description_analysis | low |
| qmetry_requirements_linked_test_cases_to_test_suite | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| Id of Test Suite (required). CRITICAL: the parameter name is 'qmTsId' — do NOT use 'tsId', 'testSuiteId', 'tsID', or other variants. Accepts a string or number. To get the qmTsId - Call API 'Testsuite/Fetch Testsuite'. From the response, get value -> data[<index>].id | unknown | description_analysis | medium |
| Comma-separated Platform IDs (required). CRITICAL: the parameter name is 'qmPlatformId' — do NOT use 'platformId', 'platformID', 'platformIds', or other variants. Accepts a number or string. To get the qmPlatformId - Call API 'Platform/List'. From the response, get value -> data[<index>].platformID | unknown | description_analysis | medium |
| qmetry_link_platforms_to_test_suite | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| Test Suite numeric ID. CRITICAL: the parameter name is 'tsID' — do NOT use 'testSuiteId', 'testSuiteID', 'suiteId', or other variants. Accepts a string or number. NOTE: To get the tsID - Call API 'Testsuite/Fetch Testsuite' From the response, get value of following attribute -> data[<index>].id | unknown | description_analysis | medium |
| qmetry_fetch_test_cases_linked_to_test_suite | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| Test Suite numeric ID. CRITICAL: the parameter name is 'tsID' — do NOT use 'testSuiteId', 'testSuiteID', 'suiteId', or other variants. Accepts a string or number. NOTE: To get the tsID - Call API 'Testsuite/Fetch Testsuite' From the response, get value of following attribute -> data[<index>].id | unknown | description_analysis | medium |
| qmetry_fetch_executions_by_test_suite | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_test_case_runs_by_test_suite_run | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| Comma-separated IDs of Test Case Runs to update. CRITICAL: the parameter name is 'entityIDs' — do NOT use 'tcRunIDs', 'testCaseRunIds', 'runIds', or other variants. Accepts a number or string (e.g., 66095087 or '66095087' for single, '66095069,66095075' for bulk). To get the entityIDs - Call API 'Execution/Fetch Testcase Run ID'. From the response, get value -> data[<index>].tcRunID | unknown | description_analysis | medium |
| Id of Test Suite Run to execute (required). CRITICAL: the parameter name is 'qmTsRunId' — do NOT use 'tsrunID', 'testSuiteRunId', 'tsRunID', or other variants. Accepts a number or string. To get the qmTsRunId - Call API 'Execution/Fetch Executions'. From the response, get value -> data[<index>].tsRunID | unknown | description_analysis | medium |
| Id of the execution status to set (required). To get the runStatusID - Call API 'Admin/Project GET info Service' From the response, get value of following attribute -> allstatus[<index>].id Common statuses: Pass, Fail, Not Run, Blocked, WIP, etc. | unknown | description_analysis | medium |
| Unique identifier of drop/build on which execution is to be performed (optional). To get the dropID - Call API 'Fetch Build/List' From the response, get value of following attribute -> data[<index>].dropID | unknown | description_analysis | medium |
| qmetry_bulk_update_test_case_execution_status | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_create_defect_or_issue | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_defects_or_issues | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| Id of Test case run (required for fetching linked issues). CRITICAL: the parameter name is 'entityId' — do NOT use 'tcRunId', 'testCaseRunId', 'runId', or other variants. Accepts a string or number. NOTE: To get the entityId - Call API 'Execution/Fetch Testcase Run ID' From the response, get value of following attribute -> data[<index>].tcRunID | unknown | description_analysis | medium |
| qmetry_fetch_linked_issues_of_test_case_run | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_link_issues_to_testcase_run | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_issue_executions | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_issues_linked_to_test_case | unknown | description_analysis | low |
| qmetry_import_automation_test_results | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_automation_status | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_bulk_update_test_run_udfs | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_test_run_udf_metadata | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| Optional rows already returned by Fetch Test Case Runs by Test Suite Run. The UDF tool will reuse these rows, enrich/pivot UDF values, and preserve identification fields instead of making the same execution-list API call again. Do NOT pass Fetch Test Case Executions rows here — those rows already have testRunUdfs enriched. Do not pass issue execution rows here; use Fetch Issue Executions output directly for issue UDFs. | unknown | description_analysis | medium |
| qmetry_fetch_test_run_udf_values | unknown | description_analysis | low |
| baseUrl | unknown | tool_schema | high |
| The base URL for the QMetry instance (must be a valid URL) | unknown | description_analysis | medium |
| qmetry_fetch_cascade_child_values | unknown | description_analysis | low |
| url | unknown | tool_schema | high |
| The web link URL | unknown | description_analysis | medium |
| zephyr_create_test_case_web_link | unknown | description_analysis | low |
| zephyr_create_test_case_steps | unknown | description_analysis | low |
| Test scripts can be written in plain text or BDD format. The BDD type supports
remote execution on a build system via API plugin.

Supported Keywords for BDD:
Given, When, Then, And, But.

For more information about BDD and Gherkin syntax, see:
https://support.smartbear.com/zephyr/docs/en/test-cases/gherkin-behavior-driven-development--bdd-.html

For Plain Text scripts, we support HTML fragments.
To create a step-by-step test script, you should use the POST /testcases/{testCaseKey}/teststeps endpoint.
 | unknown | description_analysis | medium |
| zephyr_update_test_execution | unknown | description_analysis | low |
| url | unknown | tool_schema | high |
| The web link URL | unknown | description_analysis | medium |
| zephyr_create_test_cycle_web_link | unknown | description_analysis | low |
| zephyr_update_test_execution_steps | unknown | description_analysis | low |
| Zero-indexed offset for pagination (URL query param). First page: 0. Second page: 50 (when maxResults=50). Default: 0. | unknown | description_analysis | medium |
| Number of results per page (URL query param). Default: 50. Maximum: 50 (backend enforced). To page through results, increment startAt by 50 until startAt >= total. | unknown | description_analysis | medium |
| Sort pattern sent as a URL query param. Format: 'fieldName:order'. For multiple fields, comma-separate: 'priority:asc,created:desc'. Order values: 'asc' (oldest/lowest first) or 'desc' (newest/highest first). Sortable fields: key, summary, created, updated, status, priority, executed. Examples: 'created:desc', 'key:asc', 'priority:desc,created:asc' | unknown | description_analysis | medium |
| qtm4j_search_test_cases | unknown | description_analysis | low |
| Zero-indexed offset for pagination (URL query param). Default: 0. | unknown | description_analysis | medium |
| Number of steps per page (URL query param). Default: 50. Maximum: 100. | unknown | description_analysis | medium |
| Sort pattern (URL query param). Format: 'fieldName:order'. Sortable fields: stepDetails, testData, seqNo, expectedResult. Order values: 'asc' or 'desc'. Example: 'seqNo:asc' | unknown | description_analysis | medium |
| qtm4j_get_test_steps | unknown | description_analysis | low |
| Zero-indexed offset for pagination (URL query param). Default: 0. | unknown | description_analysis | medium |
| Number of results per page (URL query param). Default: 20. Maximum: 100. To page through results, increment startAt by 20 until startAt >= total. | unknown | description_analysis | medium |
| Sort pattern sent as a URL query param. Format: 'fieldName:order'. Default: 'key:asc'. Order values: 'asc' (lowest/oldest first) or 'desc' (highest/newest first). Sortable fields: key, summary, status, plannedStartDate, plannedEndDate, defectCount. Examples: 'key:asc', 'plannedStartDate:desc' | unknown | description_analysis | medium |
| qtm4j_search_test_cycles | unknown | description_analysis | low |
| Test cycle key in the format '{PROJECT_KEY}-TR-{number}', e.g. 'SCRUM-TR-101'. Used directly as the API path parameter. | unknown | description_analysis | medium |
| qtm4j_update_test_cycle | unknown | description_analysis | low |
| qtm4j_upload_automation_result | unknown | description_analysis | low |
| ID of the remote system Configuration to update the webhook for. | unknown | description_analysis | medium |
| collaborator_update_remote_system_configuration_webhook | unknown | description_analysis | low |

### State Mutations

The following state-modifying operations were identified from tool schemas:

| Resource | Operation | Scope | Source |
| --- | --- | --- | --- |
| environment | execute | global | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |
| environment | execute | global | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |
| environment | execute | global | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| environment | write | global | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| environment | write | global | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |

_Analyzed at 2026-07-15T22:34:33.278Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 118.79 | All 7 conformance checks passed. |
| healthy | prompts | pass | 0.80 | Advertised capability responded with the minimal expected shape (2 items). |
| healthy | resources | pass | 0.54 | Advertised capability responded with the minimal expected shape (1 items). |
| healthy | tools | pass | 91.55 | Advertised capability responded with the minimal expected shape (288 items). |
| review | attack-sim | partial | 61.33 | Safe attack simulation found 11 finding(s): 0 high, 11 medium, 0 low. |
| review | runtime-profile | partial | 4.40 | Detected 260 potential egress target(s) and 417 potential state mutation(s) with high confidence. |
| review | schema-quality | partial | 55.54 | Found 86 quality finding(s) across 290 item(s): 0 warnings, 86 info. |
| act now | security | fail | 55.84 | Found 23 security finding(s): 21 high, 2 medium, 0 low. |
| act now | security-lite | fail | 2.23 | Found 23 security finding(s): 21 high, 2 medium, 0 low. |

## Evidence Snippets

### conformance — pass

Summary: All 7 conformance checks passed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: none
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 288 tool(s). (+4 more)

### prompts — pass

Summary: Advertised capability responded with the minimal expected shape (2 items).

- Endpoint: `prompts/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `2`
  - Identifiers: reflect_sap_test, contract-testing_openapi_matcher_recommendations
  - Diagnostics: - QTM4J_BASE_URL (optional): QTM4J base URL (default: https://qtmcloud.qmetry.com). Can be customized for on-premise installations., - Collaborator:, - COLLABORATOR_BASE_URL (required): Collaborator server base URL (+2 more)

### resources — pass

Summary: Advertised capability responded with the minimal expected shape (1 items).

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: - QTM4J_BASE_URL (optional): QTM4J base URL (default: https://qtmcloud.qmetry.com). Can be customized for on-premise installations., - Collaborator:, - COLLABORATOR_BASE_URL (required): Collaborator server base URL (+2 more)
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: bugsnag://event/{id}
  - Diagnostics: - QTM4J_BASE_URL (optional): QTM4J base URL (default: https://qtmcloud.qmetry.com). Can be customized for on-premise installations., - Collaborator:, - COLLABORATOR_BASE_URL (required): Collaborator server base URL (+2 more)

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (288 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `288`
  - Identifiers: bearq_run_regression_tests, bearq_run_test_cases, bearq_run_tests_in_functional_areas, bearq_refine_test_cases, bearq_refine_tests_in_functional_areas (+283 more)
  - Diagnostics: - QTM4J_BASE_URL (optional): QTM4J base URL (default: https://qtmcloud.qmetry.com). Can be customized for on-premise installations., - Collaborator:, - COLLABORATOR_BASE_URL (required): Collaborator server base URL (+2 more)

### attack-sim — partial

Summary: Safe attack simulation found 11 finding(s): 0 high, 11 medium, 0 low.

- Endpoint: `attack-sim/safe`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `11`
  - Identifiers: qmetry_create_cycle, qmetry_update_cycle, qmetry_fetch_test_case_details, qmetry_fetch_test_case_executions, qmetry_fetch_executions_by_test_suite (+6 more)
  - Diagnostics: [medium] tool "qmetry_create_cycle" contains agent behavior control text that could steer an agent., [medium] tool "qmetry_update_cycle" contains agent behavior control text that could steer an agent., [medium] tool "qmetry_fetch_test_case_details" contains agent behavior control text that could steer an agent. (+8 more)

### runtime-profile — partial

Summary: Detected 260 potential egress target(s) and 417 potential state mutation(s) with high confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `677`
  - Identifiers: none
  - Diagnostics: Egress entries: 260, State mutations: 417, Confidence: high

### schema-quality — partial

Summary: Found 86 quality finding(s) across 290 item(s): 0 warnings, 86 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `86`
  - Identifiers: bearq_run_regression_tests, bearq_expand_application_model, bugsnag_list_projects, bugsnag_list_project_event_filters, bugsnag_list_project_errors (+53 more)
  - Diagnostics: [info] tool "bearq_run_regression_tests": Has properties but no 'required' array declared, [info] tool "bearq_expand_application_model": Has properties but no 'required' array declared, [info] tool "bugsnag_list_projects": Has properties but no 'required' array declared (+83 more)

### security — fail

Summary: Found 23 security finding(s): 21 high, 2 medium, 0 low.

- Endpoint: `security/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `23`
  - Identifiers: reflect_list_suite_executions, reflect_get_suite_execution_status, reflect_execute_suite, reflect_cancel_suite_execution, contract-testing_generate_pact_tests (+18 more)
  - Diagnostics: [high] Tool "reflect_list_suite_executions" name suggests command execution capability., [high] Tool "reflect_get_suite_execution_status" name suggests command execution capability., [high] Tool "reflect_execute_suite" name suggests command execution capability. (+20 more)

### security-lite — fail

Summary: Found 23 security finding(s): 21 high, 2 medium, 0 low.

- Endpoint: `security/scan-lite`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `23`
  - Identifiers: reflect_list_suite_executions, reflect_get_suite_execution_status, reflect_execute_suite, reflect_cancel_suite_execution, contract-testing_generate_pact_tests (+18 more)
  - Diagnostics: [high] Tool "reflect_list_suite_executions" name suggests command execution capability., [high] Tool "reflect_get_suite_execution_status" name suggests command execution capability., [high] Tool "reflect_execute_suite" name suggests command execution capability. (+20 more)

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-15T223431568Z_27de5ba9`
- Gate: `fail`
