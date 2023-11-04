import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@ricons/utils'
import { Record32Regular, RecordStop16Regular } from '@ricons/fluent'
import { formatTime } from '@/utils/formatDate';
import useVideoRecorder from '@/hooks/useVideoRecorder';
import style from './VideoRecorder.module.less'

type Props = {
  el?: HTMLElement,
  audioTracks?: MediaStreamTrack[],
}

const VideoRecorder = memo((props: Props) => {
  const root = useRef<HTMLDivElement>(null)
  const [state, setState] = useState(false)
  const [time, setTime] = useState(0)
  const timeRef = useRef(0)
  const date = useMemo(() => formatTime(time), [time])
  let timer = useRef<NodeJS.Timeout>(null)
  const recorder = useRef<MediaRecorder>(null)
  // 开始录制
  const start = () => {
    // 开始录制
    setState(true)
    timeStart()
    recorder.current = useVideoRecorder(props.el, {
      background: '#2b2b2b',
      audioTracks: props.audioTracks,
    })
  }

  // 结束录制
  const end = () => {
    setState(false)
    setTime(0)
    timeRef.current = 0
    recorder.current.stop()
    recorder.current = null
    clearInterval(timer.current)
  }

  const baseTime = 1000
  function timeStart() {
    timer.current = setInterval(() => {
      setTime(() => timeRef.current += baseTime)
    }, baseTime)
  }
  const offset = useRef<{ x?: number; y?: number }>({})
  const transform = useRef({ x: 0, y: 0 })

  const mousedown = (e: MouseEvent) => {
    e.preventDefault()
    const { x, y } = e
    offset.current.x = x
    offset.current.y = y
    document.addEventListener('mousemove', mousemove)
    document.addEventListener('mouseup', mouseup)
  }

  const mousemove = useCallback((e: MouseEvent) => {
    const { x, y } = e
    const { x: x1, y: y1 } = offset.current
    transform.current.x += x - x1
    transform.current.y += y - y1
    root.current.style.transform = `translate(${transform.current.x}px, ${transform.current.y}px)`
    offset.current.x = x
    offset.current.y = y
  }, [])

  const mouseup = useCallback(() => {
    document.removeEventListener('mousemove', mousemove)
    document.removeEventListener('mouseup', mouseup)
  }, [])

  useEffect(() => {
    return function onUnmounted() {      
      mouseup()
    }
  }, [])
  return (
    <div ref={root} className={style.videoRecorder} onMouseDown={(e) => mousedown(e.nativeEvent)}>
      <div className="video-recorder-tool">
        { !state 
            ? <span className='xicon' style={{fontSize: '1em'}} title="录制" onClick={start}><Record32Regular className="start" /></span>
            : <span className='xicon' style={{fontSize: '1em'}} title="停止录制" onClick={end}><RecordStop16Regular className="end" /></span>
        }
        { state ? <span className="time">{ date }</span> : null }
      </div>
    </div>
  )
})

export default VideoRecorder