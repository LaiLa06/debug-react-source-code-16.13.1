
  /**
   * Some event types have a notion of different registration names for different
   * "phases" of propagation. This finds listeners by a given phase.
   */
  function listenerAtPhase(inst, event, propagationPhase) {
    var registrationName = event.dispatchConfig.phasedRegistrationNames[propagationPhase];
    console.log(registrationName)
    return getListener(inst, registrationName);
  }
  /**
   * A small set of propagation patterns, each of which will accept a small amount
   * of information, and generate a set of "dispatch ready event objects" - which
   * are sets of events that have already been annotated with a set of dispatched
   * listener functions/ids. The API is designed this way to discourage these
   * propagation strategies from actually executing the dispatches, since we
   * always want to collect the entire set of dispatches before executing even a
   * single one.
   */

  /**
   * Tags a `SyntheticEvent` with dispatched listeners. Creating this function
   * here, allows us to not have to bind or create functions for each event.
   * Mutating the event's members allows us to not have to create a wrapping
   * "dispatch" object that pairs the event with the listener.
   */


  function accumulateDirectionalDispatches(inst, phase, event) {
    {
      if (!inst) {
        error('Dispatching inst must not be null');
      }
    }

    var listener = listenerAtPhase(inst, event, phase);
    console.log(listener)

    if (listener) {
      // inst：事件对应的fiber
      event._dispatchListeners = accumulateInto(event._dispatchListeners, listener);
      event._dispatchInstances = accumulateInto(event._dispatchInstances, inst);
    }
  }
  /**
   * Collect dispatches (must be entirely collected before dispatching - see unit
   * tests). Lazily allocate the array to conserve memory.  We must loop through
   * each event and perform the traversal for each one. We cannot perform a
   * single traversal for the entire collection of events because each event may
   * have a different target.
   */


  function accumulateTwoPhaseDispatchesSingle(event) {
    if (event && event.dispatchConfig.phasedRegistrationNames) {
      // event._targetInst 当前事件源
      // 沿着当前事件源fiber树逐级向上查找，先父捕获子捕获到子冒泡父冒泡
      traverseTwoPhase(event._targetInst, accumulateDirectionalDispatches, event);
    }
  }
  /**
   * Accumulates without regard to direction, does not look for phased
   * registration names. Same as `accumulateDirectDispatchesSingle` but without
   * requiring that the `dispatchMarker` be the same as the dispatched ID.
   */


  function accumulateDispatches(inst, ignoredDirection, event) {
    if (inst && event && event.dispatchConfig.registrationName) {
      var registrationName = event.dispatchConfig.registrationName;
      var listener = getListener(inst, registrationName);

      if (listener) {
        event._dispatchListeners = accumulateInto(event._dispatchListeners, listener);
        event._dispatchInstances = accumulateInto(event._dispatchInstances, inst);
      }
    }
  }
  /**
   * Accumulates dispatches on an `SyntheticEvent`, but only for the
   * `dispatchMarker`.
   * @param {SyntheticEvent} event
   */


  function accumulateDirectDispatchesSingle(event) {
    if (event && event.dispatchConfig.registrationName) {
      accumulateDispatches(event._targetInst, null, event);
    }
  }

  function accumulateTwoPhaseDispatches(events) {
    // console.log("event-----",events)
    forEachAccumulated(events, accumulateTwoPhaseDispatchesSingle);
  }
  function accumulateEnterLeaveDispatches(leave, enter, from, to) {
    traverseEnterLeave(from, to, accumulateDispatches, leave, enter);
  }
  function accumulateDirectDispatches(events) {
    forEachAccumulated(events, accumulateDirectDispatchesSingle);
  }