import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  RESUME_PREVIEW_FONT_SIZES,
  RESUME_PREVIEW_LINE_HEIGHT_MAX,
  RESUME_PREVIEW_LINE_HEIGHT_MIN,
} from '@/config/resume-preview'
import {
  getModuleLabel,
  registerMcpTool,
  VALID_MODULES,
  VALID_TEMPLATES,
} from './tool-config'

/** 注册客户端生成参数表单时使用的只读元数据工具。 */
export function registerSchemaTools(server: McpServer): void {
  registerMcpTool(server,
    'schema_get',
    '获取简历数据结构定义，包括模块类型、字段配置、模板列表等元数据',
    {},
    async () => ({
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          modules: VALID_MODULES.map((key) => ({
            key,
            label: getModuleLabel(key),
          })),
          templates: VALID_TEMPLATES,
          font_sizes: RESUME_PREVIEW_FONT_SIZES,
          line_height_range: [
            RESUME_PREVIEW_LINE_HEIGHT_MIN,
            RESUME_PREVIEW_LINE_HEIGHT_MAX,
          ],
          module_types: VALID_MODULES,
          note: 'basic_info 模块不能被禁用。modules_order 必须包含所有合法模块且不能重复。',
        }, null, 2),
      }],
    }),
  )
}
