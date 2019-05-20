import { Targets, Options, Instance } from '../types'
import tippy from '..'

interface ListenerObj {
  element: Element
  eventType: string
  listener: EventListener
  options: boolean | object
}

/**
 * Creates a delegate instance that controls the creation of tippy instances
 * for child elements (`target` CSS selector).
 * Port of v4's `target` option to a separate function.
 */
export default function delegate(
  targets: Targets,
  options: Options & { target: string },
): Instance | Instance[] | null {
  const { target } = options
  delete options.target

  if (process.env.NODE_ENV !== 'production') {
    if (!target) {
      /* eslint-disable no-console */
      console.error(
        '[tippy.js ERROR] You must specify a `target` option ' +
          'indicating the CSS selector string matching the target elements ' +
          'that should receive a tippy.',
      )
      return null
    }
  }

  const instanceOrInstances = tippy(targets, {
    ...options,
    trigger: 'manual',
  })
  let listeners: ListenerObj[] = []

  function onTrigger(event: Event): void {
    if (event.target) {
      const targetNode = (event.target as Element).closest(target)

      if (targetNode) {
        tippy(targetNode, { ...options, showOnInit: true })
      }
    }
  }

  function onShow(instance: Instance): void | false {
    if (options.onShow) {
      options.onShow(instance)
    }

    return false
  }

  function on(
    element: Element,
    eventType: string,
    listener: EventListener,
    options: object | boolean = false,
  ): void {
    element.addEventListener(eventType, listener, options)
    listeners.push({
      element,
      eventType,
      listener,
      options,
    })
  }

  function addEventListeners(instance: Instance): void {
    const { reference } = instance
    instance.props.trigger
      .trim()
      .split(' ')
      .forEach(
        (eventType): void => {
          switch (eventType) {
            case 'mouseenter': {
              on(reference, 'mouseover', onTrigger)
              break
            }
            case 'focus': {
              on(reference, 'focusin', onTrigger)
              break
            }
            case 'click': {
              on(reference, 'click', onTrigger)
            }
          }
        },
      )
  }

  function removeEventListeners(listeners: ListenerObj[]): void {
    listeners.forEach(
      ({ element, eventType, listener, options }: ListenerObj): void => {
        element.removeEventListener(eventType, listener, options)
      },
    )
    listeners = []
  }

  function applyMutations(instance: Instance): void {
    const originalDestroy = instance.destroy
    instance.destroy = (): void => {
      removeEventListeners(listeners)
      originalDestroy()
    }

    addEventListeners(instance)

    instance.set({
      trigger: options.trigger || tippy.defaults.trigger,
      onShow,
    })
  }

  if (instanceOrInstances) {
    if (Array.isArray(instanceOrInstances)) {
      const instances = instanceOrInstances
      instances.forEach(applyMutations)
    } else {
      const instance = instanceOrInstances
      applyMutations(instance)
    }
  }

  return instanceOrInstances
}
