import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import RTCClient, { ConnectorInfoList, StreamType } from '/@/utils/WebRTC/rtc-client';
import { onError } from '/@/utils/WebRTC/message';
import Join from '/@/components/chatroom/Join';
import DeviceSelect, { RefType } from '/@/components/chatroom/DeviceSelect';
import MemberList from '/@/components/chatroom/MemberList';
import style from './index.module.less';
import Chat, { RefType as ChatRef } from '/@/components/chat/Chat';

export const Context = createContext(null);
const ChatRoom: React.FC = () => {
  const [isInRoom, setIsInRoom] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream>(null)
  const [displayStream, setDisplayStream] = useState<{
    streamType: 'display' | 'remoteDisplay',
    connectorId: 'display',
    remoteStream: MediaStream,
  }>(null)
  const [deviceInfo, setDeviceInfo] = useState({
    audioDisabled: false,
    cameraDisabled: false,
    audioDeviceId: '',
    cameraDeviceId: '',
    dispalyEnabled: false
  })

  const [joinDisable, setJoinDisable] = useState(true)
  const [connectorInfoList, setConnectorInfoList] = useState<ConnectorInfoList>([])

  const memberList = useMemo<{
    streamType: StreamType,
    connectorId: string,
    remoteStream?: MediaStream,
  }[]>(() => {
    const mainConnectorInfo = connectorInfoList.find(connectorInfo => connectorInfo.streamType !== 'user')    
    if (mainConnectorInfo) {
      setDisplayStream({
        streamType: 'remoteDisplay',
        connectorId: 'display',
        remoteStream: mainConnectorInfo.remoteStream,
      })
    } else if (displayStream && displayStream?.streamType !== 'display') {
      setDisplayStream(null)
    }
    return[{
      streamType: 'user',
      connectorId: 'local',
      remoteStream: localStream,
    }, ...connectorInfoList.filter(connectorInfo => connectorInfo.streamType === 'user')]
  },[connectorInfoList, localStream])

  const host = location.host
  const baseurl = process.env.BASE_URL

  let rtc = useRef<RTCClient>(null)
  if (!rtc.current) {
    rtc.current = new RTCClient({
      configuration: {
        iceServers: [
          {
            urls: `turn:stun.l.google.com:19302`,
            username: "webrtc",
            credential: "turnserver",
          },
        ],
      },
      constraints: {
        audio: true,
        video: true
      },
      socketConfig: {
        host,
      }
    })
  } else {
    rtc.current.off('connectorInfoListChange')
    rtc.current.off('displayStreamChange')
    rtc.current.off('localStreamChange')
  }

  rtc.current.on('connectorInfoListChange', (data) => {
    setConnectorInfoList(data)
  })
  
  rtc.current.on('displayStreamChange', async (stream) => {
    setDisplayStream(stream ? {
      streamType: 'display',
      connectorId: 'display',
      remoteStream: stream,
    } : null)
  
    setDeviceInfo({
      ...deviceInfo,
      dispalyEnabled: !!stream
    })
  })
  
  rtc.current.on('localStreamChange', async (stream) => {
    setLocalStream(stream)
  })

  const join = useCallback((userInfo: { username: string, roomname: string }) => {
    fetch(`${baseurl}/checkUsername?${new URLSearchParams(userInfo).toString()}`, { method: 'GET' })
      .then(response => response.json())
      .then(async data => {
        if (!data.isRepeat) {
          setIsInRoom(true)
          rtc.current.join(userInfo)
          return
        }
        onError('房间内用户名已存在')
      })
      .catch((err) => {
        console.error(err);
        onError('检查用户名失败')
      })
  }, [baseurl, rtc.current])

  // 麦克风设备切换禁用状态
  const audioDisabledToggle = (value: boolean) => {
    if (value) {
      rtc.current.disableAudio()
    } else {
      rtc.current.enableAudio().catch(() => {
        onError('启用麦克风失败')
        setDeviceInfo((deviceInfo) => {
          return {
            ...deviceInfo,
            audioDisabled: true
          }
        })
      })
    }
  }
  // 摄像头设备切换禁用状态
  const cameraDisabledToggle = (value: boolean) => {
    if (value) {
      rtc.current.disableVideo()
    } else {
      rtc.current.enableVideo().catch(() => {
        onError('启用摄像头失败')
        setDeviceInfo((deviceInfo) => {
          return {
            ...deviceInfo,
            cameraDisabled: true
          }
        })
      })
    }
  }

  // 麦克风设备切换处理事件
  const audioChange = (deviceId: string) => {
    rtc.current.replaceAudioTrack(deviceId)
  }

  // 摄像头设备切换处理事件
  const cameraChange = (deviceId: string) => {
    rtc.current.replaceVideoTrack(deviceId)
  }

  // 切换屏幕共享
  const shareDisplayMedia = async (value: boolean) => {
    if (!value) {
      rtc.current.cancelShareDisplayMedia()
      return
    }
    rtc.current.shareDisplayMedia().catch((err) => {
      onError(err.message)
      setDeviceInfo({
        ...deviceInfo,
        dispalyEnabled: false
      })
    })
  }

  const [open, setOpen] = useState(false)
  const chat = useRef<ChatRef>(null)
  const deviceSelect = useRef<RefType>(null)
  const chatBoxToggle = (value: boolean) => {
    setOpen(value)
  }

  // 退出房间
  const exit = () => {
    rtc.current.leave()
    setIsInRoom(false)
    setOpen(false)
    chat.current.clearMessage()
    deviceSelect.current.reset()
  }

  const close = (event: Event) => {
    event.preventDefault();
    exit()
    rtc.current.close()
  }

  useEffect(() => {
    rtc.current.getLocalStream().then(async (stream) => {
      setLocalStream(stream)
    }).catch((e) => {
      console.error(e)
    })

    rtc.current.getAudioDeviceInfo().then((audio) => {
      setDeviceInfo((deviceInfo) => {
        return {
          ...deviceInfo,
          audioDeviceId: audio.deviceId
        }
      })
    }).catch(() => {
      setDeviceInfo((deviceInfo) => {
        return {
          ...deviceInfo,
          audioDisabled: true
        }
      })
    })
    
    rtc.current.getVideoDeviceInfo().then((video) => {
      setDeviceInfo((deviceInfo) => {
        return {
          ...deviceInfo,
          cameraDeviceId: video.deviceId
        }
      })
    }).catch(() => {
      setDeviceInfo((deviceInfo) => {
        return {
          ...deviceInfo,
          cameraDisabled: true
        }
      })
    })

    window.addEventListener('unload', close);
    return function cleanup() {
      rtc.current.close()
      window.removeEventListener('unload', close);
    }
  }, [])
  return (
    <Context.Provider value={rtc.current}>
      <div className={style.chatRoom}>
        <div className={'chat-room-body'  + ' ' + (open ? 'open' : '')}>
          {!isInRoom
            ? <Join stream={localStream} join={join}></Join>
            : <MemberList memberList={memberList} mainStream={displayStream}></MemberList>
          }
          <div className="chat-room-tool">
            <DeviceSelect
              ref={deviceSelect}
              deviceInfo={deviceInfo}
              state={isInRoom}
              open={open}
              updateDeviceInfo={value => setDeviceInfo((deviceInfo) => ({ ...deviceInfo, ...value}))}
              onAudioChange={audioChange}
              onCameraChange={cameraChange}
              onAudioDisabledToggle={audioDisabledToggle}
              onCameraDisabledToggle={cameraDisabledToggle}
              onDispalyEnabledToggle={shareDisplayMedia}
              onChatBoxToggle={chatBoxToggle}
              onExit={exit}
            />
          </div>
        </div>
        <Chat ref={chat} open={open} />
      </div>
    </Context.Provider>
  )
}

export default ChatRoom;