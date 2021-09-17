  var UserBlockingPriority = unstable_UserBlockingPriority,
      runWithPriority = unstable_runWithPriority; // TODO: can we stop exporting these?

  var _enabled = true;
  function setEnabled(enabled) {
    _enabled = !!enabled;
  }
  function isEnabled() {
    return _enabled;
  }
  function trapBubbledEvent(topLevelType, element) {
    trapEventForPluginEventSystem(element, topLevelType, false);
  }
  function trapCapturedEvent(topLevelType, element) {
    trapEventForPluginEventSystem(element, topLevelType, true);
  }

  function trapEventForPluginEventSystem(container, topLevelType, capture) {
    
    var listener;

    // 参考资料：https://zhuanlan.zhihu.com/p/95443185
    // getEventPriorityForPluginSystem(topLevelType) 获取事件优先级
    // 根据DiscreteEvent,UserBlockingEvent,ContinuousEvent 事件类型选不同的事件派发器
    switch (getEventPriorityForPluginSystem(topLevelType)) {
      case DiscreteEvent: // 离散事件 例如blur、focus、 click、 submit、 touchStart
        listener = dispatchDiscreteEvent.bind(null, topLevelType, PLUGIN_EVENT_SYSTEM, container);
        // listener = dispatchDiscreteEvent.bind(null, click, 1, #document);
        break;

      case UserBlockingEvent: // 用户阻塞事件 例如touchMove、mouseMove、scroll、drag、dragOver等等
        listener = dispatchUserBlockingUpdate.bind(null, topLevelType, PLUGIN_EVENT_SYSTEM, container);
        break;

      case ContinuousEvent: // 连续事件 例如load、error、loadStart、abort、animationEnd. 优先级最高，持续执行，不可打断
      default:
        listener = dispatchEvent.bind(null, topLevelType, PLUGIN_EVENT_SYSTEM, container);
        break;
    }

    var rawEventName = getRawEventName(topLevelType); // 拿到对应的原生事件名

    if (capture) {
      addEventCaptureListener(container, rawEventName, listener); // 捕获阶段
    } else {
      addEventBubbleListener(container, rawEventName, listener); // 冒泡阶段
    }
  }

  function dispatchDiscreteEvent(topLevelType, eventSystemFlags, container, nativeEvent) {
    flushDiscreteUpdatesIfNeeded(nativeEvent.timeStamp); // 处理之前累计的事件,入参是事件发生的时间戳
    discreteUpdates(dispatchEvent, topLevelType, eventSystemFlags, container, nativeEvent); // 事件调度优先级
  }

  function dispatchUserBlockingUpdate(topLevelType, eventSystemFlags, container, nativeEvent) {
    runWithPriority(UserBlockingPriority, dispatchEvent.bind(null, topLevelType, eventSystemFlags, container, nativeEvent));
  }

  function dispatchEvent(topLevelType, eventSystemFlags, container, nativeEvent) {
    if (!_enabled) {
      return;
    }

    if (hasQueuedDiscreteEvents() && isReplayableDiscreteEvent(topLevelType)) {
      // If we already have a queue of discrete events, and this is another discrete
      // event, then we can't dispatch it regardless of its target, since they
      // need to dispatch in order.
      queueDiscreteEvent(null, // Flags that we're not actually blocked on anything as far as we know.
      topLevelType, eventSystemFlags, container, nativeEvent);
      return;
    }

    var blockedOn = attemptToDispatchEvent(topLevelType, eventSystemFlags, container, nativeEvent);

    if (blockedOn === null) {
      // We successfully dispatched this event.
      clearIfContinuousEvent(topLevelType, nativeEvent);
      return;
    }

    if (isReplayableDiscreteEvent(topLevelType)) {
      // This this to be replayed later once the target is available.
      queueDiscreteEvent(blockedOn, topLevelType, eventSystemFlags, container, nativeEvent);
      return;
    }

    if (queueIfContinuousEvent(blockedOn, topLevelType, eventSystemFlags, container, nativeEvent)) {
      return;
    } // We need to clear only if we didn't queue because
    // queueing is accummulative.


    clearIfContinuousEvent(topLevelType, nativeEvent); // This is not replayable so we'll invoke it but without a target,
    // in case the event system needs to trace it.

    {
      dispatchEventForLegacyPluginEventSystem(topLevelType, eventSystemFlags, nativeEvent, null);
    }
  } // Attempt dispatching an event. Returns a SuspenseInstance or Container if it's blocked.

  function attemptToDispatchEvent(topLevelType, eventSystemFlags, container, nativeEvent) {
    // TODO: Warn if _enabled is false.

    var nativeEventTarget = getEventTarget(nativeEvent); // 通过button click触发时候传的event 获取原生事件target
    var targetInst = getClosestInstanceFromNode(nativeEventTarget); // 通过_internalInstanceKey找到事件触发dom对应的fiber，由于触发事件的 DOM 节点可能没有 Fiber 对象，所以通过 node.parentNode 的方式向上遍历节点，直到找到这个 Fiber 对象。
    
    if (targetInst !== null) {
      var nearestMounted = getNearestMountedFiber(targetInst);

      if (nearestMounted === null) {
        // This tree has been unmounted already. Dispatch without a target.
        targetInst = null;
      } else {
        var tag = nearestMounted.tag;

        if (tag === SuspenseComponent) {
          var instance = getSuspenseInstanceFromFiber(nearestMounted);

          if (instance !== null) {
            // Queue the event to be replayed later. Abort dispatching since we
            // don't want this event dispatched twice through the event system.
            // TODO: If this is the first discrete event in the queue. Schedule an increased
            // priority for this boundary.
            return instance;
          } // This shouldn't happen, something went wrong but to avoid blocking
          // the whole system, dispatch the event without a target.
          // TODO: Warn.


          targetInst = null;
        } else if (tag === HostRoot) {
          var root = nearestMounted.stateNode;

          if (root.hydrate) {
            // If this happens during a replay something went wrong and it might block
            // the whole system.
            return getContainerFromFiber(nearestMounted);
          }

          targetInst = null;
        } else if (nearestMounted !== targetInst) {
          // If we get an event (ex: img onload) before committing that
          // component's mount, ignore it for now (that is, treat it as if it was an
          // event on a non-React tree). We might also consider queueing events and
          // dispatching them after the mount.
          targetInst = null;
        }
      }
    }

    {
      dispatchEventForLegacyPluginEventSystem(topLevelType, eventSystemFlags, nativeEvent, targetInst);
    } // We're not blocked on anything.

    return null;
  }