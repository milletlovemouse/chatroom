import { SaveOutlined, ScissorOutlined, CloseOutlined } from "@ant-design/icons";
import { Edit32Regular } from "@ricons/fluent";
import { PenFountain } from "@ricons/carbon";
import { getPrimitiveImage } from "./util";
import style from "./EditImage.module.less"
import { base64ToFile } from "/@/utils/fileUtils";
import useResizeObserver from "/@/hooks/useResizeObserver";
import { colorToHalfTransparent } from "/@/utils/colorUtils";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as ReactDOM from "react-dom/client";

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
  const updateCursor = (e: MouseEvent) => {
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
  }

  function updateCutInfo(e: MouseEvent) {
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
  }

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

  const cutInfoCache = useRef<typeof cutInfo>(null)
  useEffect(() => {
    cutInfoCache.current = cutInfo
    const parent = region.current?.parentElement
    const parentRect = parent?.getBoundingClientRect()
    const rect = region.current?.getBoundingClientRect()
    updateMaskStyle(rect, parentRect)
  }, [cutInfo, cutInfo])

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

    let left = Number(cutInfoCache.current.left.replace('px', ''))
    let top = Number(cutInfoCache.current.top.replace('px', ''))
    left = Math.min(Math.max(left +  (x - downX), 0), parentWidth - width)
    top = Math.min(Math.max(top +  (y - downY), 0), parentHeight - height)
    
    setCutInfo((cutInfo) => ({
      ...cutInfo,
      left: left + 'px',
      top: top + 'px'
    }))
  }, [])

  function updateDown(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    down.current = e.type === 'mousedown'
    if (down.current) {
      document.addEventListener('mousemove', updateCutInfo)
    } else {
      document.removeEventListener('mousemove', updateCutInfo)
    }
  }

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
      const cutInfotemp = { ...cutInfo }
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
      if (JSON.stringify(cutInfotemp) !== JSON.stringify(cutInfo)) {
        setCutInfo(cutInfotemp)
      }
    })
  }, [image.current, cutInfo])

  let disconnect = useRef<() => void>()
  useEffect(() => {
    disconnect.current && disconnect.current()
    if (!region.current) {
      disconnect = null
      return
    }
    disconnect.current = resizeObserver.current()
  }, [region.current, resizeObserver.current])

  type LineInfo = {
    color: string;
    lineWidth: number;
    pointList: Array<[number, number]>
  }
  const [canvasInfo, setCanvasInfo] = useState<{
    pointerEvents: 'none' | 'auto';
    pencil?: {
      list: Array<LineInfo>
    }
  }>({
    pointerEvents: 'auto',
  })
  const canvasInfoRef = useRef(canvasInfo)
  useEffect(() => {
    canvasInfoRef.current = canvasInfo
  }, [canvasInfo])

  const lineColor = useRef<string>('#FF0000')
  const lineWidth = useRef<number>(2)
  const resetCanvasInfo = () => {
    const canvasInfoListKey = ['pencil']
    canvasInfoListKey.forEach(key => delete canvasInfo[key])
    setCanvasInfo({...canvasInfo})
  }
  const pencilMouse = useCallback(function (e: MouseEvent) {
    const list = canvasInfoRef.current.pencil?.list || []
    const { offsetX, offsetY } = e
    switch(e.type) {
      case 'mousedown':
        list.push({
          color: lineColor.current,
          lineWidth: lineWidth.current,
          pointList: [[offsetX, offsetY]]
        })
        
        canvasInfoRef.current.pencil = { list }
        setCanvasInfo({...canvasInfoRef.current})
        image.current.addEventListener('mousemove', pencilMouse)
        document.addEventListener('mouseup', pencilMouse)
        break
      case 'mousemove':
      case 'mouseup':
        const lineInfo = list.at(-1)
        if (penState.current === 'markerpen') {
          lineInfo.pointList[1] = [offsetX, offsetY]
        } else {
          lineInfo.pointList.push([offsetX, offsetY])
        }
        setCanvasInfo({...canvasInfoRef.current})
        
        if (e.type === 'mouseup') {
          image.current.removeEventListener('mousemove', pencilMouse)
          document.removeEventListener('mouseup', pencilMouse)
        }
        break
      default: break
    }
  }, [])

  type PenState = 'pencil' | 'markerpen'
  const penState = useRef<PenState>(null)
  const pencil = (e: Event, options: {
    lineColor: string,
    lineWidth: number,
    state: PenState
  }) => {
    e.stopPropagation()
    lineWidth.current = options.lineWidth
    lineColor.current = options.lineColor
    penState.current = options.state
    setCutState(cutState = false)
    reset()
  }


  let [cutState, setCutState] = useState(false) // 记录是否开始裁剪
  const cut = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCutState(cutState = !cutState)
    penState.current = null
    reset()
  }

  const [img, setImg] = useState(props.img)
  useEffect(() => {
    setImg(props.img)
  }, [props.img.file, props.img.url])
  
  const save = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const canvasInfoListKey = ['pencil']
    if (!region.current && !canvasInfoListKey.find(key => !!canvasInfo[key])) return
    const canvas = document.createElement('canvas')
    const { width: imgWidth, height: imgHeight } = image.current.getBoundingClientRect()
    const { image: primitiveImage, close } = await getPrimitiveImage(img.file)
    const { width: primitiveW, height: primitiveH } = primitiveImage
    const scaleInfo = {
      wScale: primitiveW / imgWidth,
      hScale: primitiveH / imgHeight
    }
    const ctx = canvas.getContext('2d')
    
    // 裁剪
    if (region.current) {
      const { width, height } = region.current.getBoundingClientRect()
      const left = Number(cutInfo.left.replace('px', '')) * scaleInfo.wScale
      const top = Number(cutInfo.top.replace('px', '')) * scaleInfo.hScale
      const canvasWidth = width * scaleInfo.wScale
      const canvasHeight = height * scaleInfo.hScale
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      ctx.drawImage(primitiveImage, left, top, canvasWidth, canvasHeight, 0, 0, canvasWidth, canvasHeight)
    } else {
      const canvasWidth = imgWidth * scaleInfo.wScale
      const canvasHeight = imgHeight * scaleInfo.hScale
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      ctx.drawImage(primitiveImage, 0, 0, canvasWidth, canvasHeight, 0, 0, canvasWidth, canvasHeight)
    }

    canvasInfoListKey.forEach(key => {
      const data = canvasInfo[key]
      if (!data) return
      switch (key) {
        case 'pencil':
          data.list.forEach((list: LineInfo) => setCanvas(canvas, list, scaleInfo))
        default: break
      }
    })

    const dataURL = canvas.toDataURL(img.file.type)
    const newImg = {
      url: dataURL,
      file: base64ToFile(dataURL, img.file.name)
    }
    props.save(newImg, img)
    setImg(newImg)
    setCutState(cutState = false)
    penState.current = null
    resetCanvasInfo()
    reset()
    close()
  }
  const reset = () => {
    // 重置裁剪
    if (!cutState) {
      setCutInfo(cutInfo = {...cutStyle})
      document.removeEventListener('mousedown', updateDown)
      document.removeEventListener('mouseup', updateDown)
      document.removeEventListener('mousemove', updateCursor)
      root.current.parentElement.style.cursor = 'auto'
    } else {
      document.addEventListener('mousedown', updateDown)
      document.addEventListener('mouseup', updateDown)
      document.addEventListener('mousemove', updateCursor)
    }

    // 重置画笔
    if (penState.current) {
      canvasInfo.pointerEvents = 'none'
      setCanvasInfo({...canvasInfo})
      image.current.style.cursor = 'crosshair'
      image.current.addEventListener('mousedown', pencilMouse)
    } else {
      image.current.style.cursor = 'auto'
      image.current.removeEventListener('mousedown', pencilMouse)
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
      resetCanvasInfo()
      setTransition(from)
      setShowToolBar(false)
      image.current.ontransitionend = () => {
        props.close()
      }
    } else {
      props.close()
    }
  }

  useEffect(() => {
    if (props.from) {
      setTransition({})
      image.current.ontransitionend = () => {
        setShowToolBar(true)
      }
    }
    return () => {
      document.removeEventListener('mousedown', updateDown)
      document.removeEventListener('mouseup', updateDown)
      document.removeEventListener('mousemove', updateCursor)
      document.removeEventListener('mousemove', updateCutInfo)
      document.removeEventListener('mousemove', updateRegion)
    }
  }, [])

  
  function setCanvas(canvas: any, lineInfo: LineInfo, scaleInfo?: {
    wScale: number,
    hScale: number
  }) {
    if (!canvas) return
    const { wScale = 1, hScale = 1 } = scaleInfo || {}
    const [minWidth, minHeight, maxWidth, maxHeight] = lineInfo.pointList.reduce((a, b) => {
      return [
        Math.min(a[0], b[0]) * wScale,
        Math.min(a[1], b[1]) * hScale,
        Math.max(a[2], b[0]) * wScale,
        Math.max(a[3], b[1]) * hScale
      ]
    }, [Infinity, Infinity, 0, 0])
    if (!scaleInfo) {
      canvas.width = maxWidth - minWidth + lineInfo.lineWidth
      canvas.height = maxHeight - minHeight + lineInfo.lineWidth
      canvas.style.left = minWidth - lineInfo.lineWidth / 2 + 'px'
      canvas.style.top = minHeight - lineInfo.lineWidth / 2 + 'px'
    }
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = lineInfo.color
    ctx.lineWidth = lineInfo.lineWidth
    ctx.lineCap = 'round'; // 线段端点为圆角
    ctx.lineJoin = 'round'; // 线段交汇处为圆角
    ctx.beginPath()
    lineInfo.pointList.forEach((point) => {
      if (!scaleInfo) {
        ctx.lineTo(point[0] - minWidth + lineInfo.lineWidth / 2, point[1] - minHeight + lineInfo.lineWidth / 2)
      } else {
        ctx.lineTo(point[0] * wScale, point[1] * hScale)
      }
    })
    ctx.stroke()
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
          (canvasInfo.pencil?.list || []).map((lineInfo, index) => {
            return <canvas key={'pencil-' + index} className="canvas" style={{pointerEvents: canvasInfo.pointerEvents}} ref={(e) => setCanvas(e, lineInfo)}></canvas>
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
              <span className='anticon xicon' title="画笔" tabIndex={-1} onClick={(e) => pencil(e.nativeEvent, {
                lineWidth: 2,
                lineColor: '#FF0000',
                state: 'pencil'
              })}>
                <Edit32Regular></Edit32Regular>
              </span>
              <span className='anticon xicon' title="记号笔" tabIndex={-1} onClick={(e) => pencil(e.nativeEvent, {
                lineWidth: 15,
                lineColor: colorToHalfTransparent('#FF0000', 0.4),
                state: 'markerpen'
              })}>
                <PenFountain></PenFountain>
              </span>
            <ScissorOutlined title="裁剪" onClick={cut} />
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