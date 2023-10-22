
import { CloseOutlined } from "@ant-design/icons";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as ReactDOM from "react-dom/client";
import style from "./PreviewImage.module.less"

export type Img = {
  url: string;
  name: string
}

export type CssStyle = {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  opacity?: number;
}

type Props = {
  from?: CssStyle;
  img: Img;
  close: () => void;
}

const PriviewImage = memo((props: Props) => {
  const [scale, setScale] = useState(1)
  const [cursor, setCursor] = useState('grab')
  const scaleRef = useRef(scale)
  const coordinate = useRef<{x: number, y: number}>({x: 0, y: 0})
  const transform = useRef<{x: number, y: number}>({x: 0, y: 0})
  const styleTransform = useRef<{x: number, y: number}>({x: 0, y: 0})
  const target = useRef<EventTarget>(null)

  const wheel = (e: WheelEvent) => {
    setScale((scale) => Math.min(10, Math.max(0.1, scale + ((e.deltaY < 0 ? 1 : -1) * 0.1 * scale))))
  }

  const mouseMove = useCallback((e: MouseEvent) => {
    const { x, y } = e
    transform.current = { x: transform.current.x + x - coordinate.current.x, y: transform.current.y + y - coordinate.current.y }
    styleTransform.current = {x: transform.current.x / scaleRef.current, y: transform.current.y / scaleRef.current}
    ;(target.current as HTMLElement).style.transform = `translate(${styleTransform.current.x}px, ${styleTransform.current.y}px)`
    coordinate.current = { x, y }
  }, [])

  const updateMouseState = (e: MouseEvent) => {
    const state = e.type === 'mousedown' ? true : false
    if (state) {
      if (e.buttons !== 1) return
      setCursor('grabbing')
      coordinate.current = { x: e.x, y: e.y }
      document.addEventListener('mousemove', mouseMove)
      target.current = e.target
    } else {
      setCursor('grab')
      document.removeEventListener('mousemove', mouseMove)
      target.current = null
    }
  }

  const from = useMemo(() => {
    if (props.from) {
      const clientWidth = window.innerWidth
      const clientHeight = window.innerHeight
      const parentLeft = window.innerWidth / 20
      const parentTop = window.innerHeight / 20
      const parentMaxWidth = window.innerWidth - parentLeft * 2
      const parentMaxHeight = window.innerHeight - parentTop * 2
      const from = {...props.from}
      
      from.left = Math.min(from.left - (clientWidth - Math.min(from.width, parentMaxWidth)) / 2, from.left) - styleTransform.current.x
      from.top = Math.min(from.top - (clientHeight - Math.min(from.height, parentMaxHeight)) / 2, from.top) - styleTransform.current.y
      Object.keys(from).forEach(key => {
        from[key] = from[key] + 'px'
      })
      from.opacity = 0.5
      return from
    } 
    return {}
  }, [props.from, styleTransform.current])
  const [transition, setTransition] = useState(from)
  const imgRef = useRef<HTMLImageElement>(null)
  const close = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (props.from) {
      setTransition(from)
      imgRef.current.ontransitionend = () => {
        props.close()
      }
    } else {
      props.close()
    }
  }

  useEffect(function onMounted(){
    if (props.from) {
      setTransition({})
    }
    document.addEventListener('mouseup', updateMouseState)
    return function onUnmounted(){
      document.removeEventListener('mouseup', updateMouseState)
    }
  }, [])

  useEffect(() => {
    scaleRef.current = scale
    transform.current = {x: styleTransform.current.x * scale, y: styleTransform.current.y * scale}
  }, [scale])

  return (
    <div className={style.previewImage} onClick={close} onWheel={(e) => wheel(e.nativeEvent)}>
      <div className="close" onClick={close}><CloseOutlined /></div>
      <div className="mask-layer"></div>
      <div className="preview-image-container">
        <img
          ref={imgRef}
          className="image"
          style={{ scale: String(scale), cursor, ...transition }}
          src={props.img.url}
          alt={props.img.name}
          onMouseDown={(e) => updateMouseState(e.nativeEvent)}
          onMouseUp={(e) => updateMouseState(e.nativeEvent)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  )
})

export function usePriviewImage(img: Img, from?: CssStyle){
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
  app.render(<PriviewImage img={img} from={from} close={close}></PriviewImage>)
  document.body.appendChild(root)
  return close
}

export default PriviewImage