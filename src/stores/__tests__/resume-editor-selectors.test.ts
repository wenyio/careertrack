import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { shallow } from 'zustand/shallow'
import { useResumeEditorStore } from '@/stores/resume-editor'
import {
  selectResumeEditorDataActions,
  selectResumeEditorToolbar,
  selectResumeFormPane,
  selectResumeModuleSidebar,
  selectResumePreviewPane,
} from '@/stores/resume-editor-selectors'

describe('resume editor selectors', () => {
  beforeEach(() => {
    useResumeEditorStore.getState().reset()
  })

  afterEach(() => {
    useResumeEditorStore.getState().reset()
  })

  it('正文更新只改变表单和预览订阅切片', () => {
    const before = useResumeEditorStore.getState()
    const toolbarBefore = selectResumeEditorToolbar(before)
    const dataActionsBefore = selectResumeEditorDataActions(before)
    const sidebarBefore = selectResumeModuleSidebar(before)
    const formBefore = selectResumeFormPane(before)
    const previewBefore = selectResumePreviewPane(before)

    before.setContent('summary', '只应更新正文消费者')

    const after = useResumeEditorStore.getState()
    expect(shallow(
      toolbarBefore,
      selectResumeEditorToolbar(after),
    )).toBe(true)
    expect(shallow(
      dataActionsBefore,
      selectResumeEditorDataActions(after),
    )).toBe(true)
    expect(shallow(
      sidebarBefore,
      selectResumeModuleSidebar(after),
    )).toBe(true)
    expect(shallow(
      formBefore,
      selectResumeFormPane(after),
    )).toBe(false)
    expect(shallow(
      previewBefore,
      selectResumePreviewPane(after),
    )).toBe(false)
  })

  it('保存状态和自定义标题只改变对应订阅切片', () => {
    const before = useResumeEditorStore.getState()
    const toolbarBefore = selectResumeEditorToolbar(before)
    const sidebarBefore = selectResumeModuleSidebar(before)

    before.setSaveStatus('pending')
    const pending = useResumeEditorStore.getState()
    expect(shallow(
      toolbarBefore,
      selectResumeEditorToolbar(pending),
    )).toBe(false)
    expect(shallow(
      sidebarBefore,
      selectResumeModuleSidebar(pending),
    )).toBe(true)

    const toolbarPending = selectResumeEditorToolbar(pending)
    pending.setContent('module_titles', { projects: '代表项目' })
    const titled = useResumeEditorStore.getState()
    expect(shallow(
      toolbarPending,
      selectResumeEditorToolbar(titled),
    )).toBe(true)
    expect(shallow(
      sidebarBefore,
      selectResumeModuleSidebar(titled),
    )).toBe(false)
  })
})
