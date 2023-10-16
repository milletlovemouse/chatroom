import React, { memo, useMemo } from "react";
import UserIcon from "../user-icon";
import { ConnectorInfoList, StreamType } from "/@/utils/WebRTC/rtc-client";
import style from './MemberList.module.less'

type Props = {
  memberList: ConnectorInfoList,
  mainStream?: {
    streamType: StreamType,
    connectorId: string,
    remoteStream: MediaStream,
  },
}
const MemberList = memo((props: Props) => {
  const { mainStream } = props
  const setVideo = (v: HTMLVideoElement, stream: MediaStream) => {
    if (!v) return
    v.srcObject = stream
    v.onloadedmetadata = () => {
      v.play();
    }; 
  }
  const setAudio = (a: HTMLAudioElement, stream: MediaStream) => {
    if (!a) return
    a.srcObject = stream
  }
  const memberList = useMemo(() => {
    return props.memberList.map((item) => {
      const audioActive = !!item.remoteStream?.getAudioTracks()?.length
      const videoActive = !!item.remoteStream?.getVideoTracks()?.length
      return {
        ...item,
        audioActive,
        videoActive
      }
    })
  }, [props.memberList])

  const display = useMemo(() => mainStream ? 'block' : 'grid', [mainStream])

  const columns = useMemo(() => {
    const num = memberList.length
    return Math.min(Math.ceil(Math.sqrt(num)), 4)
  }, [memberList])

  const rows = useMemo(() => {
    const num = memberList.length
    return Math.ceil(num / columns)
  }, [memberList])

  const cloWidth = useMemo(() => {
    return (100 / columns).toFixed(2) + '%'
  }, [columns])

  const rowHeight = useMemo(() => {
    const num = memberList.length
    if (num > 16) return '25%'
    return (100 / rows).toFixed(2) + '%'
  }, [memberList, rows])

  const width = useMemo(() => mainStream ? '248px' : '100%', [mainStream])

  const background = useMemo(() => mainStream ? '#222' : 'transparent', [mainStream])
  return (
    <div className={style.member}>
      <div className="member-list" style={{
        width,
        display,
        gridTemplateColumns: `repeat(${columns}, ${cloWidth})`,
        gridTemplateRows: `repeat(${rows}, ${rowHeight})`,
        background,
      }}>
        {
          memberList.map(connectorInfo => {
            if (connectorInfo.videoActive) {
              return (
                <div className="video-box" key={connectorInfo.connectorId}>
                  <video ref={(v: HTMLVideoElement) => setVideo(v, connectorInfo.remoteStream)}></video>
                </div>
              )
            } else {
              return (
                <div className="video-box" key={connectorInfo.connectorId}>
                  <UserIcon style={{border: `2px solid #444`}} />
                  {connectorInfo.audioActive
                    ? <audio ref={(a: HTMLAudioElement) => setAudio(a, connectorInfo.remoteStream)}></audio>
                    : ''
                  }
                </div>
              )
            }
          })
        }
      </div>
      <div className="question-master">
        {mainStream
          ? <div className="video-box main-video-box">
              <video ref={(v: HTMLVideoElement) => setVideo(v, mainStream.remoteStream)}></video>
            </div>
          : ''
        }
      </div>
    </div>
  )
})

export default MemberList