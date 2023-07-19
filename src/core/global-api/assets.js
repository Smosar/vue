/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

// 注册组件
export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  ASSET_TYPES.forEach(type => {
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id) // 验证组件的名称是否合法
        }
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
/**
 * export function initAssetRegisters (Vue: GlobalAPI) { ... }：这是一个导出的函数，接收一个名为 Vue 的参数，类型为 GlobalAPI。GlobalAPI 可能是 Vue.js 内部用于表示全局 API 的类型。
 * ASSET_TYPES：ASSET_TYPES 是一个包含 'component' 和 'directive' 的字符串数组。它用于定义需要注册的资源类型，即组件和指令。
 * ASSET_TYPES.forEach(type => { ... })：通过遍历 ASSET_TYPES 数组，为每种资源类型（组件和指令）注册对应的全局方法。
 * Vue[type] = function (id: string, definition: Function | Object): Function | Object | void { ... }：这是注册资源的全局方法。对于每种资源类型，将其注册为 Vue 构造函数的一个方法，以便全局调用。
 * id：id 参数是资源的唯一标识符，用于在注册资源时指定其名称
 * definition：definition 参数是一个函数或对象，用于定义组件或指令的配置信息
 * 方法体：
 * 首先，判断是否传入了 definition 参数。如果没有传入 definition，则直接返回该类型下的已注册资源（组件或指令）。
 * 如果传入了 definition，则根据资源类型的不同，做一些处理：
 * 如果是组件，首先检查是否是开发环境，并调用 validateComponentName 方法来验证组件的名称是否合法。然后通过 this.options._base.extend(definition) 来创建组件构造函数，并将其保存在 options.components 中。
 * 如果是指令，并且 definition 是一个函数类型，将其转换为具有 bind 和 update 钩子的对象。
 * 最后，将定义好的组件或指令保存在 options.components 或 options.directives 中，并返回该资源的定义。
 * 总结：
 *    这段代码用于在 Vue 构造函数上注册全局的组件和指令的注册方法。通过遍历 ASSET_TYPES 数组，为每种资源类型注册对应的全局方法。
 *    这些方法可以在全局范围内用于注册组件或指令，使其可以在整个 Vue 应用中使用。
 */