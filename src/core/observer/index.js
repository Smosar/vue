/* @flow */

import Dep from "./dep";
import VNode from "../vdom/vnode";
import { arrayMethods } from "./array";
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering,
} from "../util/index";

const arrayKeys = Object.getOwnPropertyNames(arrayMethods);

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true;

export function toggleObserving(value: boolean) {
  shouldObserve = value;
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor(value: any) {
    this.value = value;
    this.dep = new Dep();
    this.vmCount = 0;
    def(value, "__ob__", this);
    if (Array.isArray(value)) {
      if (hasProto) {
        protoAugment(value, arrayMethods);
      } else {
        copyAugment(value, arrayMethods, arrayKeys);
      }
      this.observeArray(value);
    } else {
      this.walk(value);
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk(obj: Object) {
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      // defineReactive函数 用于将对象的属性转换为响应式属性。
      // 它接收两个参数：要转换的对象 obj 和要转换为响应式的属性名 keys[i]
      defineReactive(obj, keys[i]);
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray(items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i]);
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment(target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src;
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment(target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];
    def(target, key, src[key]);
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 * 这段代码用于观察一个对象，并在满足一定条件时创建观察器。观察器（Observer）用于实现 Vue.js 的响应式机制，它会递归地遍历对象的属性，
 * 将其转换为响应式的数据，并在数据发生变化时通知相关的依赖进行更新。同时，它会避免重复观察同一个对象，确保每个对象只有一个观察器。
 */
export function observe(value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    // 不是对象或是一个特殊的虚拟 DOM 节点 VNode
    return;
  }
  let ob: Observer | void;
  if (hasOwn(value, "__ob__") && value.__ob__ instanceof Observer) {
    // 如果 value 对象中已经有 __ob__ 属性，并且 value.__ob__ 是一个 Observer 实例，
    // 说明该对象已经被观察过，直接将 value.__ob__ 赋值给 ob
    ob = value.__ob__;
  } else if (
    // 检查是否满足创建观察器的条件
    shouldObserve && // 一个标志位，用于标识是否需要观察对象。通常在 init 阶段设置为 true，表示当前处于初始化阶段需要观察数据
    !isServerRendering() && // 排除在服务端渲染的情况，因为在服务端渲染时不需要创建观察器
    (Array.isArray(value) || isPlainObject(value)) && // 只有当 value 是数组或普通对象时，才需要创建观察器
    Object.isExtensible(value) && // 检查 value 是否可扩展，即是否可以添加新的属性
    !value._isVue // 排除 Vue 实例本身，因为 Vue 实例已经有了自己的观察机制
  ) {
    ob = new Observer(value);
  }
  if (asRootData && ob) {
    // 如果 asRootData 参数为 true，表示 value 是根数据，将 ob.vmCount 属性加一
    ob.vmCount++;
  }
  return ob; // ob观察器对象
}

/**
 * Define a reactive property on an Object.
 */
export function defineReactive(
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  const dep = new Dep();

  const property = Object.getOwnPropertyDescriptor(obj, key);
  if (property && property.configurable === false) {
    return;
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get;
  const setter = property && property.set;
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key];
  }

  let childOb = !shallow && observe(val);
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val;
      if (Dep.target) {
        dep.depend();
        if (childOb) {
          childOb.dep.depend();
          if (Array.isArray(value)) {
            dependArray(value);
          }
        }
      }
      return value;
    },
    set: function reactiveSetter(newVal) {
      const value = getter ? getter.call(obj) : val;
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return;
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== "production" && customSetter) {
        customSetter();
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return;
      if (setter) {
        setter.call(obj, newVal);
      } else {
        val = newVal;
      }
      childOb = !shallow && observe(newVal);
      dep.notify();
    },
  });
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 * vue2无法监听到数组下标，可以通过set的方式实现数据响应式！！！！！！！！！！
 */
export function set(target: Array<any> | Object, key: any, val: any): any {
  if (
    process.env.NODE_ENV !== "production" &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(
      `Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`
    );
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key);
    target.splice(key, 1, val);
    return val;
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val;
    return val;
  }
  const ob = (target: any).__ob__;
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== "production" &&
      warn(
        "Avoid adding reactive properties to a Vue instance or its root $data " +
          "at runtime - declare it upfront in the data option."
      );
    return val;
  }
  if (!ob) {
    target[key] = val;
    return val;
  }
  // defineReactive函数 用于将对象的属性转换为响应式属性。
  // 它接收两个参数：要转换的对象 obj 和要转换为响应式的属性名 keys[i]
  defineReactive(ob.value, key, val);
  ob.dep.notify();
  return val;
}

/**
 * Delete a property and trigger change if necessary.
 * 这段代码用于删除数组或对象中的属性或元素。它通过一系列条件判断，
 * 包括目标对象是否为 undefined、null 或基本类型的值、是否是数组并且 key 是否为有效的数组索引、是否是 Vue 实例或具有观察者实例的根数据对象等，
 * 来判断是否可以删除属性或元素。如果满足条件，将执行相应的删除操作，并在必要时发出警告。
 * 这是 Vue.js 响应式系统中处理属性删除的一部分逻辑
 */
export function del(target: Array<any> | Object, key: any) {
  // 检查目标对象 target 是否为 undefined、null 或基本类型的值。在开发环境中，
  // 如果目标对象 target 是 undefined、null 或基本类型的值，将发出警告，提示不能删除这些非响应式对象上的属性。
  if (
    process.env.NODE_ENV !== "production" &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(
      `Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`
    );
  }
  // 判断目标对象 target 是否为数组，并且 key 是否为有效的数组索引。
  // 如果是，则使用 target.splice(key, 1) 方法删除数组中的元素，并返回。
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1);
    return;
  }
  // 目标对象 target 的 __ob__ 属性赋值给变量 ob。__ob__ 属性是由响应式系统添加的，用于追踪对象的依赖关系
  const ob = (target: any).__ob__;
  // 判断目标对象 target 是否是 Vue 实例或具有观察者实例（ob）的根数据对象。
  // 如果是，说明目标对象是 Vue 实例或 Vue 实例的根数据对象，不建议直接删除其属性，而是将其设置为 null
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== "production" &&
      warn(
        "Avoid deleting properties on a Vue instance or its root $data " +
          "- just set it to null."
      );
    return;
  }
  if (!hasOwn(target, key)) {
    return;
  }
  delete target[key];
  if (!ob) {
    return;
  }
  ob.dep.notify();
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray(value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i];
    e && e.__ob__ && e.__ob__.dep.depend();
    if (Array.isArray(e)) {
      dependArray(e);
    }
  }
}
