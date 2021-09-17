  function addEventBubbleListener(element, eventType, listener) {
    /* element:document / dom 
    *  eventType: "click"
    *  listener: 根据事件类型区分的特定的listener
    */
    element.addEventListener(eventType, listener, false);
  }
  function addEventCaptureListener(element, eventType, listener) {
    element.addEventListener(eventType, listener, true);
  }