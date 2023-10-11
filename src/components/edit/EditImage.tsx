import { SaveOutlined, ScissorOutlined, CloseOutlined } from "@ant-design/icons";
import { getImageOriginalSize } from "./util";
import style from "./EditImage.module.less"
import { base64ToFile } from "/@/utils/fileUtils";
import useResizeObserver from "/@/hooks/useResizeObserver";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import * as ReactDOM from "react-dom/client";

export type Img = {
  file: File,
  url: string
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
  close?: () => void
}

export const EditImage = memo((props: Props) => {
  // 图片文件的尺寸
  const originalSize = useRef<{ width?: number, height?: number }>({})
  useEffect(() => {(async () => {
    const { width, height } = await getImageOriginalSize(props.img.file)
    originalSize.current.width = width
    originalSize.current.height = height
  })()}, [props.img.file])

  const root = useRef<HTMLDivElement>(null)
  const image = useRef<HTMLImageElement>(null)
  // const canvas = useRef<HTMLCanvasElement>(null)
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
  const berder = 3
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
      width = right - x
      setCutInfo((cutInfo) => ({
        ...cutInfo,
        left: (x - parentLeft) + 'px',
        width: width + 'px'
      }))
    }
    function updateTop() {
      height = bottom - y
      setCutInfo((cutInfo) => ({
        ...cutInfo,
        top: (y - parentTop) + 'px',
        height: height + 'px'
      }))
    }
    function updateWidth() {
      width = x - left
      setCutInfo((cutInfo) => ({
        ...cutInfo,
        width: width + 'px'
      }))
    }
    function updateHeight() {
      height = y - top
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
    // 测试
    // const { width: imgWidth, height: imgHeight } = image.value.getBoundingClientRect()
    // const widthScale = originalSize.width / imgWidth
    // const heightScale = originalSize.height / imgHeight
    // canvas.value.width = width
    // canvas.value.height = height
    // const ctx = canvas.value.getContext('2d')
    // ctx.drawImage(image.value, left * widthScale, top * heightScale, width * widthScale, height * heightScale, 0, 0, width, height)
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
      setCutInfo(cutInfotemp)
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

  let [cutState, setCutState] = useState(false) // 记录是否开始裁剪
  const cut = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCutState(cutState = !cutState)
    reset()
  }
  const save = (e: React.MouseEvent) => {
    if (!region.current) return
    e.stopPropagation()
    const canvas = document.createElement('canvas')
    const { width: imgWidth, height: imgHeight } = image.current.getBoundingClientRect()
    const { width, height } = region.current.getBoundingClientRect()
    const left = Number(cutInfo.left.replace('px', '')) * originalSize.current.width / imgWidth
    const top = Number(cutInfo.top.replace('px', '')) * originalSize.current.height / imgHeight
    const canvasWidth = width * originalSize.current.width / imgWidth
    const canvasHeight = height * originalSize.current.height / imgHeight
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image.current, left, top, canvasWidth, canvasHeight, 0, 0, width, height)
    const dataURL = canvas.toDataURL("image/png")
    setCutState(false)
    reset()
    props.save({
      url: dataURL,
      file: base64ToFile(dataURL, props.img.file.name)
    }, props.img)
  }
  const reset = () => {
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
  }

  const updateMoveDown = (e: React.MouseEvent) => {    
    e.stopPropagation()
    // 按下还是抬起
    if (e.type === 'mousedown') {
      const { x, y } = e.nativeEvent
      downInfo.current = { x, y }
      document.addEventListener('mousemove', updateRegion)
    } else {
      document.removeEventListener('mousemove', updateRegion)
    }
  }

  useEffect(() => {
    return () => {
      document.removeEventListener('mousedown', updateDown)
      document.removeEventListener('mouseup', updateDown)
      document.removeEventListener('mousemove', updateCursor)
      document.removeEventListener('mousemove', updateCutInfo)
      document.removeEventListener('mousemove', updateRegion)
    }
  }, [])
  return (
    <div ref={root} className={style.editImage}>
      <div className="close" onClick={props.close}><CloseOutlined /></div>
      <div className="mask-layer"></div>
      <div className="edit-image-container">
        <img ref={image} className="image" src={props.img.url} alt={props.img.file.name} />
        {/* <canvas ref={canvas} class={style.canvas}></canvas> */}
        { cutState
          ? <div className="cut">
              <div ref={region} style={cutInfo} className="region">
                <div onMouseDown={updateMoveDown} onMouseUp={updateMoveDown} className="fill"></div>
              </div>
              <div ref={topEl} className="top"></div>
              <div ref={bottomEl} className="bottom"></div>
              <div ref={leftEl} className="left"></div>
              <div ref={rightEl} className="right"></div>
            </div>
          : null }
        <div className="toolbar" onMouseDown={(e) => e.stopPropagation()}>
          <ScissorOutlined title="裁剪" onClick={cut} />
          <SaveOutlined title="保存" onClick={save} />
        </div>
      </div>
    </div>
  )
})

export function useEditImage(img: Img | Img, save?: Save){
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
  app.render(<EditImage img={img} save={save} close={close} />)

  document.body.appendChild(root)
  return close
}

export default EditImage