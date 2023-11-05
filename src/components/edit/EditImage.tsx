import { SaveOutlined, ScissorOutlined, CloseOutlined, RiseOutlined, ExpandOutlined, BorderOutlined } from "@ant-design/icons";
import { Edit32Regular } from "@ricons/fluent";
import { PenFountain } from "@ricons/carbon";
import { IosRedo, IosUndo } from "@ricons/ionicons4"
import draw, { cropPicture, getOriginalImageRect } from "./util";
import style from "./EditImage.module.less"
import { base64ToFile } from "/@/utils/fileUtils";
import useResizeObserver from "/@/hooks/useResizeObserver";
import { colorToHalfTransparent } from "/@/utils/colorUtils";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import classnames from "classnames";
import * as ReactDOM from "react-dom/client";
import { onSuccess, onWarning } from "/@/utils/WebRTC/message";
import { AutoAwesomeMosaicSharp } from "@ricons/material";
import deepcopy from "deepcopy";

export type Img = {
  file: File,
  url: string
}

export type CssStyle = {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  opacity?: number;
}

export type Save = (newImg: Img, oldImg: Img ) => void;

enum Position {
  Left,
  Left_Top,
  Top,
  Right_Top,
  Right,
  Right_Bottom,
  Bottom,
  Left_Bottom
}

type Props = {
  img: Img,
  save: Save,
  close: () => void,
  from?: CssStyle
}

export const EditImage = memo((props: Props) => {
  const root = useRef<HTMLDivElement>(null)
  const image = useRef<HTMLImageElement>(null)
  const region = useRef<HTMLDivElement>(null)
  const topEl = useRef<HTMLDivElement>(null)
  const bottomEl = useRef<HTMLDivElement>(null)
  const leftEl = useRef<HTMLDivElement>(null)
  const rightEl = useRef<HTMLDivElement>(null)
  const inputColor = useRef<HTMLInputElement>(null)
  const cursors = ['auto', 'nwse-resize', 'nesw-resize', 'ew-resize', 'ns-resize']
  const cutStyle = {
    left: '0px',
    top: '0px',
    width: '100%',
    height: '100%',
  }
  const berder = 1
  const down = useRef(false) // 记录鼠标按下
  const position = useRef(0) // 记录鼠标落点
  let [cutInfo, setCutInfo] = useState({...cutStyle})
  const ltOverlap = (x: number, y: number) => x < y
  const rbOverlap = (x: number, y: number) => x > y
  const updateCursor = useCallback((e: MouseEvent) => {
    e.stopPropagation()
    if (down.current || !region.current) return
    const rect = region.current.getBoundingClientRect()
    const { left, right, top, bottom } = rect
    const { x, y } = e
    if ((ltOverlap(x, left) && ltOverlap(y, top)) || (rbOverlap(x, right) && rbOverlap(y, bottom))) {
      root.current.parentElement.style.cursor = cursors[1]
      position.current = (ltOverlap(x, left) && ltOverlap(y, top)) ? Position.Left_Top : Position.Right_Bottom
    } else if ((rbOverlap(x, right) && ltOverlap(y, top)) || (ltOverlap(x, left) && rbOverlap(y, bottom))) {
      root.current.parentElement.style.cursor = cursors[2]
      position.current = (rbOverlap(x, right) && ltOverlap(y, top)) ? Position.Right_Top : Position.Left_Bottom
    } else if (ltOverlap(x, left) || rbOverlap(x, right)) {
      root.current.parentElement.style.cursor = cursors[3]
      position.current = ltOverlap(x, left) ? Position.Left : Position.Right
    } else if (ltOverlap(y, top) || rbOverlap(y, bottom)) {
      root.current.parentElement.style.cursor = cursors[4]
      position.current = ltOverlap(y, top) ? Position.Top : Position.Bottom
    }
  }, [])

  const updateCutInfo = useCallback((e: MouseEvent) => {
    if (!down.current || !region.current) return
    const parent = region.current.parentElement
    const parentRect = parent.getBoundingClientRect()
    const rect = region.current.getBoundingClientRect()
    let { left: parentLeft, right: parentRight, top: parentTop, bottom: parentBottom } = parentRect
    let { left, right, top, bottom } = rect
    let { x, y } = e
    if (x < parentLeft) x = parentLeft
    if (y < parentTop) y = parentTop

    let width: number, height: number, minSize = 3 * berder

    switch (position.current) {
      case Position.Left:
        if (x > parentRight - minSize) x = parentRight - minSize
        updateLeft()
        if (width <= minSize){
          position.current = Position.Right
        }
        break
      case Position.Left_Top:
        if (x > parentRight - minSize) x = parentRight - minSize
        if (y > parentBottom - minSize) y = parentBottom - minSize
        updateLeft()
        updateTop()
        if (width <= minSize && height <= minSize){
          position.current = Position.Right_Bottom
        } else if (width <= minSize){
          position.current = Position.Right_Top
        } else if (height <= minSize){
          position.current = Position.Left_Bottom
        }
        break
      case Position.Top:
        if (y > parentBottom - minSize) y = parentBottom - minSize
        updateTop()
        if (height <= minSize){
          position.current = Position.Bottom
        }
        break
      case Position.Right_Top:
        if (x > parentRight) x = parentRight
        if (y > parentBottom - minSize) y = parentBottom - minSize
        updateWidth()
        updateTop()
        if (width <= minSize && height <= minSize){
          position.current = Position.Left_Bottom
        } else if (width <= minSize){
          position.current = Position.Left_Top
        } else if (height <= minSize){
          position.current = Position.Right_Bottom
        }
        break
      case Position.Right:
        if (x > parentRight) x = parentRight
        updateWidth()
        if (width <= minSize){
          position.current = Position.Left
        }
        break
      case Position.Right_Bottom:
        if (x > parentRight) x = parentRight
        if (y > parentBottom) y = parentBottom
        updateWidth()
        updateHeight()
        if (width <= minSize && height <= minSize){
          position.current = Position.Left_Top
        } else if (width <= minSize){
          position.current = Position.Left_Bottom
        } else if (height <= minSize){
          position.current = Position.Right_Top
        }
        break
      case Position.Bottom:
        if (y > parentBottom) y = parentBottom
        updateHeight()
        if (height <= minSize){
          position.current = Position.Top
        }
        break
      case Position.Left_Bottom:
        if (x > parentRight - minSize) x = parentRight - minSize
        if (y > parentBottom) y = parentBottom
        updateLeft()
        updateHeight()
        if (width <= minSize && height <= minSize){
          position.current = Position.Right_Top
        } else if (width <= minSize){
          position.current = Position.Right_Bottom
        } else if (height <= minSize){
          position.current = Position.Left_Top
        }
        break
      default:
        break
    }

    function updateLeft() {
      width = Math.max(right - x, 0)
      setCutInfo((cutInfo) => ({
        ...cutInfo,
        left: (x - parentLeft) + 'px',
        width: width + 'px'
      }))
    }
    function updateTop() {
      height = Math.max(bottom - y, 0)
      setCutInfo((cutInfo) => ({
        ...cutInfo,
        top: (y - parentTop) + 'px',
        height: height + 'px'
      }))
    }
    function updateWidth() {
      width = Math.max(x - left, 0)
      setCutInfo((cutInfo) => ({
        ...cutInfo,
        width: width + 'px'
      }))
    }
    function updateHeight() {
      height = Math.max(y - top, 0)
      setCutInfo((cutInfo) => ({
        ...cutInfo,
        height: height + 'px'
      }))
    }
  }, [])

  function updateMaskStyle(rect: DOMRect, parentRect: DOMRect) {
    if (!rect || !parentRect) return
    const { width: rectWidth, height: rectHeight } = rect
    const { width: parentWidth, height: parentHeight } = parentRect
    let left = Number(cutInfo.left.replace('px', ''))
    let top = Number(cutInfo.top.replace('px', ''))
    let width = Number(cutInfo.width.replace('px', ''))
    let height = Number(cutInfo.height.replace('px', ''))
    if (cutInfo.width.match('%')) width = rectWidth
    if (cutInfo.height.match('%')) height = rectHeight
    leftEl.current.style.top = top + 'px'
    leftEl.current.style.width = left + 'px'
    leftEl.current.style.height = height + 'px'
    topEl.current.style.height = top + 'px'
    rightEl.current.style.top = top + 'px'
    rightEl.current.style.width = parentWidth - width - left + 'px'
    rightEl.current.style.height = height + 'px'
    bottomEl.current.style.height = parentHeight - height - top + 'px'
  }

  const cutInfoRef = useRef<typeof cutInfo>(null)
  useEffect(() => {
    cutInfoRef.current = cutInfo
    const parent = region.current?.parentElement
    const parentRect = parent?.getBoundingClientRect()
    const rect = region.current?.getBoundingClientRect()
    updateMaskStyle(rect, parentRect)
  }, [cutInfo])

  const downInfo = useRef<{
    x: number
    y: number
  }>(null)
  const updateRegion = useCallback((e: MouseEvent) => {
    if (!region.current) return
    const { x: downX, y: downY } = downInfo.current
    
    const { x, y } = e
    downInfo.current = { x, y }
    const parent = region.current.parentElement
    const parentRect = parent.getBoundingClientRect()
    const rect = region.current.getBoundingClientRect()
    const { width: parentWidth, height: parentHeight } = parentRect
    const { width, height } = rect

    let left = Number(cutInfoRef.current.left.replace('px', ''))
    let top = Number(cutInfoRef.current.top.replace('px', ''))
    left = Math.min(Math.max(left +  (x - downX), 0), parentWidth - width)
    top = Math.min(Math.max(top +  (y - downY), 0), parentHeight - height)
    
    setCutInfo((cutInfo) => ({
      ...cutInfo,
      left: left + 'px',
      top: top + 'px'
    }))
  }, [])

  const updateDown = useCallback((e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    down.current = e.type === 'mousedown'
    if (down.current) {
      document.addEventListener('mousemove', updateCutInfo)
    } else {
      document.removeEventListener('mousemove', updateCutInfo)
    }
  }, [])

  const resizeObserver = useRef<() => () => void>(null)
  const imageSize = useRef<{ width?: number, height?: number }>(null)
  useEffect(() => {
    if (!image.current) return
    const { width, height } = image.current.getBoundingClientRect()
    imageSize.current = {
      width,
      height
    }
  }, [image.current])

  useEffect(() => {
    resizeObserver.current = useResizeObserver(image.current, ([entry]) => {
      if (!image.current || !region.current) return
      const { borderBoxSize } = entry
      const { inlineSize: newWidth, blockSize: newHeight } = borderBoxSize[0]
      const { width: oldWidth, height: oldHeight } = imageSize.current
      const cutInfotemp = { ...cutInfoRef.current }
      imageSize.current = {
        width: newWidth,
        height: newHeight
      }
      const left = Number(cutInfotemp.left.replace('px', '')) * newWidth / oldWidth
      const top = Number(cutInfotemp.top.replace('px', '')) * newHeight / oldHeight
      cutInfotemp.left = left + 'px'
      cutInfotemp.top = top + 'px'
      if (!cutInfotemp.width.match('%')) {
        const width = Number(cutInfotemp.width.replace('px', '')) * newWidth / oldWidth
        cutInfotemp.width = width + 'px'
      }
      if (!cutInfotemp.height.match('%')) {
        const height = Number(cutInfotemp.height.replace('px', '')) * newHeight / oldHeight
        cutInfotemp.height = height + 'px'
      }
      if (JSON.stringify(cutInfotemp) !== JSON.stringify(cutInfoRef.current)) {
        setCutInfo(cutInfotemp)
      }
    })
  }, [image.current])

  let disconnect = useRef<() => void>()
  useEffect(() => {
    disconnect.current && disconnect.current()
    if (!region.current) {
      disconnect = null
      return
    }
    disconnect.current = resizeObserver.current()
  }, [region.current, resizeObserver.current])


  type GraphState = 'pencil' | 'markerpen' | 'polyline' | 'rect' | 'mosaic'
  let [graphState, setGraphState] = useState<GraphState>(null)
  const graphStateRef = useRef(graphState)
  useEffect(() => {
    graphStateRef.current = graphState
  }, [graphState])

  type LineInfo = {
    type: GraphState;
    lineColor: string;
    lineWidth: number;
    pointList: Array<[number, number]>
  }
  const [canvasInfo, setCanvasInfo] = useState<{
    // css属性，元素不会成为事件的target
    pointerEvents: 'none' | 'auto';
    // 画笔线段数据
    graphList?: Array<LineInfo>
  }>({
    pointerEvents: 'auto',
  })
  const redoGraphList = useRef<Array<LineInfo>>([])
  const canvasInfoRef = useRef(canvasInfo)
  useEffect(() => {
    canvasInfoRef.current = canvasInfo
  }, [canvasInfo])

  const [lineColor, setLineColor] = useState<string>('#FF0000')
  const lineColorMemo = useMemo(() => graphState === 'markerpen' ? colorToHalfTransparent(lineColor, 0.4) : lineColor, [graphState, lineColor])
  const [lineWidth, setLineWidth] = useState<number>(2)
  const lineColorRef = useRef(lineColorMemo)
  const lineWidthRef = useRef(lineWidth)
  useEffect(() => {
    lineColorRef.current = lineColorMemo
  }, [lineColorMemo])
  useEffect(() => {
    lineWidthRef.current = lineWidth
  }, [lineWidth])

  const resetCanvasInfo = () => {
    delete canvasInfo.graphList
    setCanvasInfo({...canvasInfo})
  }

  // 折线交互状态
  const polylineStateRef = useRef({
    down: false,
    move: false,
    begin: true, // 决定当前点是否为折线起始点，受down、move影响
  })

  useEffect(() => {
    polylineStateRef.current = {
      down: false,
      move: false,
      begin: true,
    }
    image.current.removeEventListener('mousemove', drawMouse)
    document.removeEventListener('mouseup', drawMouse)
  }, [graphState])


  // 'pencil' | 'markerpen' | 'rect' mousedown 事件
  const pencilDown = (e: MouseEvent, list: Array<LineInfo>) => {
    const { offsetX, offsetY } = e
    list.push({
      type: graphStateRef.current,
      lineColor: lineColorRef.current,
      lineWidth: lineWidthRef.current,
      pointList: [[offsetX, offsetY]]
    })
    canvasInfoRef.current.graphList = list
    image.current.addEventListener('mousemove', drawMouse)
    document.addEventListener('mouseup', drawMouse)
    setCanvasInfo({...canvasInfoRef.current})
  }
  const markerpenDown = pencilDown
  const rectDown = pencilDown
  const mosaicDown = rectDown

  // 'polyline' mousedown 事件
  const polylineDown = (e: MouseEvent, list: Array<LineInfo>) => {
    const { offsetX, offsetY } = e
    polylineStateRef.current.down = true
    if (polylineStateRef.current.begin) {
      list.push({
        type: graphStateRef.current,
        lineColor: lineColorRef.current,
        lineWidth: lineWidthRef.current,
        pointList: [[offsetX, offsetY], [offsetX, offsetY]]
      })
    } else {
      const pointList = list.at(-1).pointList
      pointList.push([offsetX, offsetY])
    }
    canvasInfoRef.current.graphList = list
    setCanvasInfo({...canvasInfoRef.current})
    if (polylineStateRef.current.begin) {
      image.current.addEventListener('mousemove', drawMouse)
      document.addEventListener('mouseup', drawMouse)
    }
  }

  // 'pencil' mousemove 事件
  const pencilMove = (e: MouseEvent, list: Array<LineInfo>) => {
    const { offsetX, offsetY } = e
    const lineInfo = list.at(-1)
    lineInfo.pointList.push([offsetX, offsetY])
    setCanvasInfo({...canvasInfoRef.current})
  }

  // 'markerpen' | 'rect' mousemove 事件
  const markerpenMove = (e: MouseEvent, list: Array<LineInfo>) => {
    const { offsetX, offsetY } = e
    const lineInfo = list.at(-1)
    lineInfo.pointList[1] = [offsetX, offsetY]
    setCanvasInfo({...canvasInfoRef.current})
  }
  const rectMove = markerpenMove
  const mosaicMove = rectMove

  // 'polyline' mousemove 事件
  const polylineMove = (e: MouseEvent, list: Array<LineInfo>) => {
    const { offsetX, offsetY } = e
    const lineInfo = list.at(-1)
    const point = lineInfo.pointList.at(-1)
    point[0] = offsetX
    point[1] = offsetY
    if (polylineStateRef.current.down) {
      polylineStateRef.current.move = true
    }
    setCanvasInfo({...canvasInfoRef.current})
  }

  // 'pencil' | 'markerpen' | 'rect' mouseup 事件
  const pencilUp = () => {
    image.current.removeEventListener('mousemove', drawMouse)
    document.removeEventListener('mouseup', drawMouse)
  }
  const markerpenUp = pencilUp
  const rectUp = pencilUp
  const mosaicUp = rectUp

  // 'polyline' mouseup 事件
  const polylineUp = () => {
    if (graphStateRef.current === 'polyline') {
      polylineStateRef.current.begin = polylineStateRef.current.move
      polylineStateRef.current.down = false
      polylineStateRef.current.move = false
    }
    if (polylineStateRef.current.begin) {
      image.current.removeEventListener('mousemove', drawMouse)
      document.removeEventListener('mouseup', drawMouse)
    }
  }
  const mouseHandleMap = {
    mousedown: {
      pencil: pencilDown,
      markerpen: markerpenDown,
      polyline: polylineDown,
      rect: rectDown,
      mosaic: mosaicDown,
    },
    mousemove: {
      pencil: pencilMove,
      markerpen: markerpenMove,
      polyline: polylineMove,
      rect: rectMove,
      mosaic: mosaicMove,
    },
    mouseup: {
      pencil: pencilUp,
      markerpen: markerpenUp,
      polyline: polylineUp,
      rect: rectUp,
      mosaic: mosaicUp,
    }
  }
  
  const drawMouse = useCallback(function (e: MouseEvent) {
    if (e.target !== image.current) return
    const list = canvasInfoRef.current.graphList || []
    mouseHandleMap[e.type][graphStateRef.current](e, list)
    if (e.type === 'mousedown') {
      redoGraphList.current = []
    }
  }, [])

  const graphStateToggle = (e: Event, options: {
    lineWidth: number,
    state: GraphState
  }) => {
    e.stopPropagation()
    setLineWidth(options.lineWidth)
    setGraphState(graphState = graphState === options.state ? null : options.state)
    setCutState(cutState = false)
    reset()
  }


  let [cutState, setCutState] = useState(false) // 记录是否开始裁剪
  const cut = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCutState(cutState = !cutState)
    setGraphState(graphState = null)
    reset()
  }

  const [img, setImg] = useState(props.img)
  useEffect(() => {
    setImg(props.img)
  }, [props.img.file, props.img.url])

  const originalImageRect = useRef<DOMRect>(null)
  useEffect(() => {
    (async () => {
      originalImageRect.current = await getOriginalImageRect(img.file)
    })()
  }, [img])
  
  const save = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canvasInfo.graphList && !region.current) {
      onWarning('无任何操作！')
      return
    }
    let canvas = document.createElement('canvas')
    const { width: imgWidth, height: imgHeight } = image.current.getBoundingClientRect()
    const { width: primitiveW, height: primitiveH } = originalImageRect.current
    const scaleInfo = {
      wScale: primitiveW / imgWidth,
      hScale: primitiveH / imgHeight
    }
    const ctx = canvas.getContext('2d')
    const canvasWidth = imgWidth * scaleInfo.wScale
    const canvasHeight = imgHeight * scaleInfo.hScale
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    ctx.drawImage(image.current, 0, 0, canvasWidth, canvasHeight, 0, 0, canvasWidth, canvasHeight)

    if (canvasInfo.graphList)
      canvasInfo.graphList.forEach((list: LineInfo) => setCanvas(canvas, list, {...scaleInfo, isSave: true}))

    // 裁剪
    if (region.current) {
      const { width, height } = region.current.getBoundingClientRect()
      const left = Number(cutInfo.left.replace('px', '')) * scaleInfo.wScale
      const top = Number(cutInfo.top.replace('px', '')) * scaleInfo.hScale
      const cvsWidth = width * scaleInfo.wScale
      const cvsHeight = height * scaleInfo.hScale
      canvas = cropPicture(canvas, left, top, cvsWidth, cvsHeight)
    }

    const dataURL = canvas.toDataURL(img.file.type)
    const newImg = {
      url: dataURL,
      file: base64ToFile(dataURL, img.file.name)
    }
    props.save(newImg, img)
    setImg(newImg)
    lineInfoMap.current = {}
    setCutState(cutState = false)
    setGraphState(graphState = null)
    resetCanvasInfo()
    reset()
    onSuccess('保存成功！')
  }
  const reset = () => {
    // 重置裁剪
    if (cutState) {
      document.addEventListener('mousedown', updateDown)
      document.addEventListener('mouseup', updateDown)
      document.addEventListener('mousemove', updateCursor)
    } else {
      setCutInfo(cutInfo = {...cutStyle})
      document.removeEventListener('mousedown', updateDown)
      document.removeEventListener('mouseup', updateDown)
      document.removeEventListener('mousemove', updateCursor)
      root.current.parentElement.style.cursor = 'auto'
    }

    // 重置画笔
    if (graphState) {
      canvasInfo.pointerEvents = 'none'
      setCanvasInfo({...canvasInfo})
      image.current.style.cursor = 'crosshair'
      image.current.addEventListener('mousedown', drawMouse)
    } else {
      image.current.style.cursor = 'auto'
      image.current.removeEventListener('mousedown', drawMouse)
    }
  }

  const updateMoveDown = (e: React.MouseEvent) => {
    // 按下还是抬起
    if (e.type === 'mousedown') {
      e.stopPropagation()
      const { x, y } = e.nativeEvent
      downInfo.current = { x, y }
      document.addEventListener('mousemove', updateRegion)
    } else {
      document.removeEventListener('mousemove', updateRegion)
    }
  }

  const undo = () => {
    if (!canvasInfo.graphList?.length){
      return
    }
    const lineInfo = canvasInfo.graphList.pop()
    redoGraphList.current.push(lineInfo)
    const key = `canvas-${lineInfo.type}-${canvasInfo.graphList.length}`
    delete lineInfoMap.current[key]
    setCanvasInfo({...canvasInfo})
  }

  const redo = () => {
    if (!redoGraphList.current.length) {
      return
    }
    const lineInfo = redoGraphList.current.pop()
    canvasInfo.graphList.push(lineInfo)
    setCanvasInfo({...canvasInfo})    
  }

  const lineWidthResize = useCallback((e: WheelEvent) => {
    if (!graphStateRef.current) return
    const value = e.deltaY > 0 ? 1 : -1
    setLineWidth((lineWidth) => Math.max(1, Math.min(16, lineWidth + value)))
  }, [])

  const [showToolBar, setShowToolBar] = useState(!props.from)
  const from = useMemo(() => {
    if (props.from) {
      const clientWidth = window.innerWidth
      const clientHeight = window.innerHeight
      const parentLeft = window.innerWidth / 20
      const parentTop = window.innerHeight / 20
      const parentMaxWidth = window.innerWidth - parentLeft * 2
      const parentMaxHeight = window.innerHeight - parentTop * 2
      const from = {...props.from}
      from.left = Math.min(from.left - (clientWidth - Math.min(from.width, parentMaxWidth)) / 2, from.left)
      from.top = Math.min(from.top - (clientHeight - Math.min(from.height, parentMaxHeight)) / 2, from.top)
      Object.keys(from).forEach(key => {
        from[key] = from[key] + 'px'
      })
      from.opacity = 0.5
      return from
    } 
    return {}
  }, [props.from])
  const [transition, setTransition] = useState(from)
  const close = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (props.from) {
      setTransition(from)
      setShowToolBar(false)
      setCutState(cutState = false)
      setGraphState(graphState = null)
      resetCanvasInfo()
      reset()
      image.current.ontransitionend = () => {
        props.close()
      }
    } else {
      props.close()
    }
  }

  useEffect(function onMounted() {
    if (props.from) {
      setTransition({})
      image.current.ontransitionend = () => {
        setShowToolBar(true)
        const { width, height } = image.current.getBoundingClientRect()
        imageSize.current = {
          width,
          height
        }
      }
    }
    document.addEventListener('wheel', lineWidthResize)
    return function onUnmounted() {
      document.removeEventListener('mousedown', updateDown)
      document.removeEventListener('mouseup', updateDown)
      document.removeEventListener('mousemove', updateCursor)
      document.removeEventListener('mousemove', updateCutInfo)
      document.removeEventListener('mousemove', updateRegion)
      document.removeEventListener('mouseup', drawMouse)
      document.removeEventListener('wheel', lineWidthResize)
    }
  }, [])

  // 已经渲染的数据
  let lineInfoMap = useRef<Record<string, LineInfo>>({})
  /**
   * @param canvas 
   * @param lineInfo 
   * @param scaleInfo // 与原图的缩放比例，保存时此参数才最需要
   * @returns 
   */
  function setCanvas(canvas: HTMLCanvasElement, lineInfo: LineInfo & {key?: string}, scaleInfo?: {
    wScale: number,
    hScale: number,
    isSave?: boolean
  }) {
    if (!canvas) return
    const key = lineInfo.key
    if (key) {
      // 已经渲染的数据不再渲染
      if (lineInfoMap.current[key] && JSON.stringify(lineInfoMap.current[key]) === JSON.stringify(lineInfo)) {
        return
      } else {
        // 数据更新重新保存
        lineInfoMap.current[key] = deepcopy(lineInfo)
      }
    }
    
    const { lineColor, lineWidth, pointList } = lineInfo
    const option = {
      lineColor,
      lineWidth,
      pointList,
      scaleInfo
    }
    if (lineInfo.type === 'rect') {
      draw.drawRect(canvas, option)
    } else if (lineInfo.type === 'mosaic') {
      if (!scaleInfo) {
        const { width: imgWidth, height: imgHeight } = image.current.getBoundingClientRect()
        const { width: primitiveW, height: primitiveH } = originalImageRect.current
        option.scaleInfo = {
          wScale: primitiveW / imgWidth,
          hScale: primitiveH / imgHeight
        }
      }
      draw.drawMosaic(canvas, {
        ...option,
        img: image.current
      })
    } else {
      draw.drawLine(canvas, option)
    }
  }
  return (
    <div ref={root} className={style.editImage}>
      <div className="close" onClick={close}><CloseOutlined /></div>
      <div className="mask-layer"></div>
      <div className="edit-image-container">
        <img
          ref={image}
          style={{
            ...transition
          }}
          className="image"
          src={img.url}
          alt={img.file.name}
        />
        {
          (canvasInfo.graphList || []).map((lineInfo, index) => {
            return (
              <canvas
                className="canvas"
                ref={(e) => setCanvas(e, {...lineInfo, key: `canvas-${lineInfo.type}-${index}`})}
                key={`canvas-${lineInfo.type}-${index}`}
                style={{pointerEvents: canvasInfo.pointerEvents}}>
              </canvas>
            )
          })
        }
        { cutState
          ? <div className="cut">
              <div
                ref={region}
                style={cutInfo}
                className="region"
                onMouseDown={updateMoveDown}
                onMouseUp={updateMoveDown}
              >
                <div className="left-top"></div>
                <div className="left-bottom"></div>
                <div className="right-top"></div>
                <div className="right-bottom"></div>
              </div>
              <div ref={topEl} className="top"></div>
              <div ref={bottomEl} className="bottom"></div>
              <div ref={leftEl} className="left"></div>
              <div ref={rightEl} className="right"></div>
            </div>
          : null }
        { showToolBar ?
          <div className="toolbar" onMouseDown={(e) => e.stopPropagation()}>
            <span
              title={`${lineWidth}`}
              className="anticon edit-style"
              onClick={() => inputColor.current.click()}
            >
              <span className="line-width">
                <span
                  className="point"
                  style={{
                    background: lineColorMemo,
                    width: lineWidth + 'px',
                    height: lineWidth + 'px'
                  }}
                ></span>
              </span>
              <input type="color" ref={inputColor} value={lineColor} onChange={(e) => setLineColor(e.target.value)} />
            </span>
            <BorderOutlined
              className={classnames({active: graphState === 'rect'})}
              title="矩形"
              onClick={(e) => graphStateToggle(e.nativeEvent, {
                lineWidth: 2,
                state: 'rect'
              })}
            />
            <RiseOutlined
              className={classnames({active: graphState === 'polyline'})}
              title="折线"
              onClick={(e) => graphStateToggle(e.nativeEvent, {
                lineWidth: 5,
                state: 'polyline'
              })}
            />
            <span
              className={classnames('anticon xicon', {active: graphState === 'pencil'})}
              title="画笔"
              tabIndex={-1}
              onClick={(e) => graphStateToggle(e.nativeEvent, {
                lineWidth: 2,
                state: 'pencil'
              })}
            >
              <Edit32Regular></Edit32Regular>
            </span>
            <span
              className={classnames('anticon xicon', {active: graphState === 'markerpen'})}
              title="记号笔"
              tabIndex={-1}
              onClick={(e) => graphStateToggle(e.nativeEvent, {
                lineWidth: 15,
                state: 'markerpen'
              })}
            >
              <PenFountain></PenFountain>
            </span>
            <span
              className={classnames('anticon xicon', {active: graphState === 'mosaic'})}
              title="马赛克"
              tabIndex={-1}
              onClick={(e) => graphStateToggle(e.nativeEvent, {
                lineWidth: 0,
                state: 'mosaic'
              })}
            >
              <AutoAwesomeMosaicSharp />
            </span>
            <ExpandOutlined className={classnames({active: cutState})} title="裁剪" onClick={cut} />
            {/* <ScissorOutlined className={classnames({active: cutState})} title="裁剪" onClick={cut} /> */}
            <span
              className="anticon xicon"
              title="撤销"
              tabIndex={-1}
              onClick={undo}
            >
              <IosUndo />
            </span>
            <span
              className="anticon xicon"
              title="重做"
              tabIndex={-1}
              onClick={redo}
            >
              <IosRedo />
            </span>
            <CloseOutlined title="退出编辑" onClick={close} />
            <SaveOutlined title="保存" onClick={save} />
          </div>
          : null }
      </div>
    </div>
  )
})

export function useEditImage(img: Img, options: {
  save: Save,
  from?: CssStyle
}){
  const { save, from } = options || {}
  const root = document.createElement('div')
  const style = {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: '100%',
  }
  Object.keys(style).forEach(key => root.style[key] = style[key])
  const app = ReactDOM.createRoot(root)
  const close = () => {
    app.unmount()
    root.remove()
  }
  app.render(<EditImage img={img} save={save} close={close} from={from} />)

  document.body.appendChild(root)
  return close
}

export default EditImage