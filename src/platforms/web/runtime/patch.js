/* @flow */

// nodeOps 就是一些dom功能
import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
// 包括了一些属性，类，事件，样式等处理方法
import baseModules from 'core/vdom/modules/index'

import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
const modules = platformModules.concat(baseModules)

/**
 * 这个函数用于处理虚拟 DOM 和真实 DOM 的差异，并将变化的部分反映到实际页面上，实现 Vue.js 的响应式更新机制
 * nodeOps 是用于操作 DOM 元素的一组方法。这些方法包括创建元素、设置元素属性、插入元素等。
 *         它们在不同的平台上可以有不同的实现，因为 Vue.js 支持多种环境，比如浏览器、服务器端渲染等。
 * modules 是一组模块，每个模块都提供了对不同特性的处理策略，比如样式、事件、指令等。这些模块将根据虚拟 DOM 的变化来更新真实 DOM。
 * createPatchFunction 函数将 nodeOps 和 modules 作为配置传递，并返回一个实际的 patch 函数，这个函数用于将虚拟 DOM 更新到真实 DOM。
 */
export const patch: Function = createPatchFunction({ nodeOps, modules })
