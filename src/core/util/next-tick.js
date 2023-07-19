/* @flow */
/* globals MutationObserver */

import { noop } from 'shared/util'
import { handleError } from './error'
import { isIE, isIOS, isNative } from './env'

export let isUsingMicroTask = false

const callbacks = []
let pending = false

function flushCallbacks () {
  pending = false
  const copies = callbacks.slice(0)
  callbacks.length = 0
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}

// Here we have async deferring wrappers using microtasks.
// In 2.5 we used (macro) tasks (in combination with microtasks).
// However, it has subtle problems when state is changed right before repaint
// (e.g. #6813, out-in transitions).
// Also, using (macro) tasks in event handler would cause some weird behaviors
// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
// So we now use microtasks everywhere, again.
// A major drawback of this tradeoff is that there are some scenarios
// where microtasks have too high a priority and fire in between supposedly
// sequential events (e.g. #4521, #6690, which have workarounds)
// or even between bubbling of the same event (#6566).
let timerFunc

// The nextTick behavior leverages the microtask queue, which can be accessed
// via either native Promise.then or MutationObserver.
// MutationObserver has wider support, however it is seriously bugged in
// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
// completely stops working after triggering a few times... so, if native
// Promise is available, we will use it:
/* istanbul ignore next, $flow-disable-line */
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
    // In problematic UIWebViews, Promise.then doesn't completely break, but
    // it can get stuck in a weird state where callbacks are pushed into the
    // microtask queue but the queue isn't being flushed, until the browser
    // needs to do some other work, e.g. handle a timer. Therefore we can
    // "force" the microtask queue to be flushed by adding an empty timer.
    // 根据当前环境是否是 iOS 系统，决定是否调用 setTimeout 函数，但在 setTimeout 中执行的回调函数是一个空操作，即没有任何实际动作。
    // 这种代码可能是用于在某些特定环境下做一些优化或占位操作，或者是用于处理特殊情况的边界条件
    if (isIOS) setTimeout(noop)
  }
  isUsingMicroTask = true
} else if (!isIE && typeof MutationObserver !== 'undefined' && (
  isNative(MutationObserver) ||
  // PhantomJS and iOS 7.x
  MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
  // Use MutationObserver where native Promise is not available,
  // e.g. PhantomJS, iOS7, Android 4.4
  // (#6466 MutationObserver is unreliable in IE11)
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  observer.observe(textNode, {
    characterData: true
  })
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
  isUsingMicroTask = true
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  // Fallback to setImmediate.
  // Technically it leverages the (macro) task queue,
  // but it is still a better choice than setTimeout.
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  // Fallback to setTimeout.
  timerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}

/**
 * - 用于在下一次 DOM 更新循环之后执行回调函数
 * - 用于在下一次 DOM 更新循环之后执行回调函数的函数。它会将回调函数推入 callbacks 数组，
 * 并在合适的时机调用回调函数，以确保回调函数在 DOM 更新之后被执行。如果没有传入回调函数，且当前环境支持 Promise，
 * 则会返回一个 Promise 实例，在下一次 DOM 更新循环之后会被 resolve
 */
export function nextTick (cb?: Function, ctx?: Object) {
  let _resolve
  // 将一个函数推入 callbacks 数组。callbacks 是一个全局数组，
  // 用于存储需要在下一次 DOM 更新循环时执行的回调函数
  callbacks.push(() => {
    /**
     * 首先判断是否传入了回调函数 cb，如果传入了，则执行回调函数，并在执行过程中捕获可能的异常，并通过 handleError 函数处理异常。
     * 如果未传入回调函数 cb，则检查是否存在 _resolve，如果存在，则执行 _resolve(ctx)。这通常是在使用 Promise 的情况下
     */
    if (cb) {
      try {
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
  // 检查是否有未处理的回调函数。如果没有，将 pending 设置为 true，表示有待处理的回调函数
  if (!pending) {
    pending = true
    // 是一个异步函数或定时器，用于在当前执行栈的任务执行完毕后，进入下一个事件循环时执行回调函数
    timerFunc()
  }
  // $flow-disable-line
  // 如果没有传入回调函数 cb，且当前环境支持 Promise，则返回一个 Promise 实例，该 Promise 在下一次 DOM 更新循环之后会被 resolve
  if (!cb && typeof Promise !== 'undefined') {
    // 创建一个 Promise 实例，并将其 resolve 函数赋值给 _resolve。在回调函数中，如果没有传入回调函数 cb，将执行 _resolve(ctx)
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}
